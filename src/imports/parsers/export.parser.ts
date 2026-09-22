import * as XLSX from 'xlsx';
import { BaseParser } from '../base';
import type { ReducedParse } from '../base';
import type { NormalizedBill } from '../types';

// 自家"账单导出"文件（xlsx/csv）回导：
// 导出列见 server bills.service EXPORT_COLUMNS，此处按表头名取列，与列顺序无关。
// 已命名消费的列；其余列（交易类型/优惠/减免/账户/来源/来源分组/来源文件等）统一进 extraJson 完整保留。
const NAMED_COLS = [
  '时间', '金额', '收支类型', '分类', '对方', '对方账号', '商户单号', '交易订单号',
  '交易状态', '收/付款方式', '卡号', '额外信息(JSON)', '原始数据(JSON)', '备注',
];

export class ExportParser extends BaseParser {
  detect(fileName: string): boolean {
    return /账单导出/i.test(fileName) && /\.(xlsx|csv)$/i.test(fileName);
  }

  // 本系统导出的文件含"收支类型"+"原始数据(JSON)"两个独有表头列
  identify(rows: unknown[][]): boolean {
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const j = String((rows[i] || []).join(','));
      if (j.includes('收支类型') && j.includes('原始数据(JSON)')) return true;
    }
    return false;
  }

  async parse(bytes: Uint8Array, fileName: string, mapping?: Record<string, string>): Promise<ReducedParse> {
    const wb = XLSX.read(bytes, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });

    const header = (rows[0] || []).map((h) => String(h).trim().replace(/^\ufeff/, ''));
    const idx = (name: string) => header.findIndex((h) => h === name);
    if (idx('时间') < 0 || idx('金额') < 0) {
      throw new Error('无法识别导出文件表头（缺少"时间,金额"列），请使用本系统"账单导出"生成的文件');
    }
    const col = {
      time: idx('时间'), amount: idx('金额'), billType: idx('收支类型'), category: idx('分类'),
      counterParty: idx('对方'), counterpartyAccount: idx('对方账号'), merchantNo: idx('商户单号'),
      externalId: idx('交易订单号'), status: idx('交易状态'), payMethod: idx('收/付款方式'),
      cardNo: idx('卡号'), extraJson: idx('额外信息(JSON)'), rawData: idx('原始数据(JSON)'), note: idx('备注'),
    };

    const namedCols = new Set(NAMED_COLS);
    const bills: NormalizedBill[] = [];
    const skipped: { row: number; reason: string; raw?: unknown }[] = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every((v) => v === '' || v === null || v === undefined)) continue;
      const get = (i: number) => (i >= 0 && row[i] !== undefined && row[i] !== null ? String(row[i]).trim() : '');

      const timeRaw = get(col.time);
      const time = this.parseTime(timeRaw);
      if (!time) {
        skipped.push({ row: r + 1, reason: `时间无效(${timeRaw})`, raw: this.buildRaw(header, row) });
        continue;
      }

      // 金额列导出为非负文本；按收支类型确定符号与类型（不计收支保持正数）
      const amountCents = this.toCents(get(col.amount));
      const typeRaw = get(col.billType);
      let billType: 'income' | 'expense' | 'neutral';
      let neutral = false;
      if (typeRaw.includes('不计') || typeRaw.includes('中性')) { billType = 'neutral'; neutral = true; }
      else if (typeRaw.includes('支出')) billType = 'expense';
      else if (typeRaw.includes('收入') || typeRaw.includes('入账')) billType = 'income';
      else billType = amountCents >= 0n ? 'income' : 'expense';
      const signedAmount = (!neutral && billType === 'expense' && amountCents > 0n)
        ? -amountCents
        : (!neutral && billType === 'income' && amountCents < 0n ? -amountCents : amountCents);

      // 额外信息(JSON) 列解析后与未命名列(账户/来源/交易类型等)合并
      let extraJson: Record<string, unknown> | undefined;
      const extraStr = get(col.extraJson);
      if (extraStr) {
        try {
          const p = JSON.parse(extraStr);
          if (p && typeof p === 'object' && !Array.isArray(p)) extraJson = { ...p };
        } catch { /* 忽略坏 JSON，不阻断该行 */ }
      }
      const built = this.buildExtra(header, row, namedCols);
      if (built) extraJson = { ...(extraJson || {}), ...built };

      // 原始数据(JSON) 列还原为原始记录
      let rawData: unknown;
      const rawStr = get(col.rawData);
      if (rawStr) {
        try { rawData = JSON.parse(rawStr); } catch { rawData = rawStr; }
      }

      bills.push({
        time,
        amountCents: signedAmount,
        billType,
        neutral,
        sourceCategory: get(col.category) || undefined,
        remark: get(col.note) || undefined,
        externalId: get(col.externalId) || undefined,
        counterParty: get(col.counterParty) || undefined,
        counterpartyAccount: get(col.counterpartyAccount) || undefined,
        merchantNo: get(col.merchantNo) || undefined,
        payMethod: get(col.payMethod) || undefined,
        cardNo: get(col.cardNo) || undefined,
        status: get(col.status) || undefined,
        extraJson,
        rawData,
      });
    }

    return { bills, skipped };
  }

  // "YYYY-MM-DD HH:mm:ss"（导出 formatDateTime 格式）-> 北京时间 ISO 字符串
  protected parseTime(s: string): string | undefined {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return undefined;
    return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || '00'}+08:00`;
  }
}