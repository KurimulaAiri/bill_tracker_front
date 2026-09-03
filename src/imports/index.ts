// 浏览器本地解析账单文件：唯一公共出口
// 原始账单文件不再上传服务器，解析为标准化账单 JSON 后由调用方 POST /imports/confirm 入库
import { findParser } from './registry';
import type { ParseResult } from './types';

export interface ParseBillResult {
  parse: ParseResult;
  hints: { accountHint?: string; unknownCategories: string[] };
}

export async function parseBillFile(file: File): Promise<ParseBillResult> {
  const found = findParser(file.name);
  if (!found) {
    throw new Error(`暂不支持该文件格式: ${file.name}（支持支付宝csv/微信xlsx/建行活期xls/建行信用卡pdf）`);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { bills, skipped, accountHint } = await found.parser.parse(bytes, file.name);

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