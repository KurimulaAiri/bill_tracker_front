// 浏览器本地解析账单文件：唯一公共出口
// 原始账单文件不再上传服务器，解析为标准化账单 JSON 后由调用方 POST /imports/confirm 入库
import * as XLSX from 'xlsx';
import { findParser, findParserByContent } from './registry';
import type { ParseResult } from './types';

export interface ParseBillResult {
  parse: ParseResult;
  hints: { accountHint?: string; unknownCategories: string[] };
}

// 提取表格行（供内容识别）；PDF 无表格行结构返回 null
function readTableRows(bytes: Uint8Array, fileName: string): unknown[][] | null {
  if (fileName.toLowerCase().endsWith('.pdf')) return null;
  try {
    const wb = XLSX.read(bytes, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  } catch {
    return null;
  }
}

// 挑解析器：优先内容识别（不依赖文件名），PDF 或内容未命中时回退文件名识别
function pickParser(bytes: Uint8Array, fileName: string): RegisteredParser | undefined {
  const rows = readTableRows(bytes, fileName);
  if (rows) {
    const byContent = findParserByContent(rows);
    if (byContent) return byContent;
  }
  return findParser(fileName);
}

// mapping: 该文件来源的字段列名映射 { fieldKey: columnName }，未配置的字段解析器回退默认列名
export async function parseBillFile(file: File, mapping?: Record<string, string>): Promise<ParseBillResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const found = pickParser(bytes, file.name);
  if (!found) {
    throw new Error(`暂不支持该文件格式: ${file.name}（支持支付宝csv/微信xlsx/建行活期xls/建行信用卡pdf/本地导出xlsx,csv）`);
  }

  const { bills, skipped, accountHint } = await found.parser.parse(bytes, file.name, mapping);

  // 归一化载荷（与后端 upload 返回的结构一致，供 confirm 直接使用）：
  // - amountCents: bigint -> string（JSON 传输）
  // - time: Date -> ISO 字符串（预览 formatTime 需要 string）
  const normalized = bills.map((b) => ({
    ...b,
    time: b.time instanceof Date ? b.time.toISOString() : (b.time as any),
    amountCents: b.amountCents.toString(),
  }));

  return {
    parse: {
      source: found.source,
      fileName: file.name,
      total: normalized.length,
      bills: normalized,
      skipped,
      accountHint,
    },
    hints: { accountHint, unknownCategories: [] },
  };
}