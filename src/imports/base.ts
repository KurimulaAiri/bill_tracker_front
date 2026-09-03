import type { NormalizedBill, Parser } from './types';

export type { Parser };
export interface ReducedParse {
  bills: NormalizedBill[];
  skipped: { row: number; reason: string }[];
  accountHint?: string;
}

export abstract class BaseParser implements Parser {
  abstract detect(fileName: string): boolean;
  abstract parse(bytes: Uint8Array, fileName: string): Promise<ReducedParse>;

  // 金额字符串 -> 分（bigint）。如 "12.82" -> 1282, "-1,000.00" -> -100000
  protected toCents(amountStr: string): bigint {
    const cleaned = String(amountStr).replace(/,/g, '').replace(/[^\d.-]/g, '').trim();
    if (!cleaned) return 0n;
    const value = Math.round(parseFloat(cleaned) * 100);
    return BigInt(value);
  }

  // 按收/支三值 + 金额符号 推导 billType
  protected resolveBillType(
    incomeExpenseKey?: string,
    signedAmount?: bigint,
  ): { billType: 'income' | 'expense' | 'neutral'; neutral: boolean } {
    const key = incomeExpenseKey || '';
    if (key.includes('中性') || key.includes('不计收支')) {
      return { billType: 'neutral', neutral: true };
    }
    if (key === '收入' || key === '入账' || key === '收入/入账') {
      return { billType: 'income', neutral: false };
    }
    if (key === '支出') {
      return { billType: 'expense', neutral: false };
    }
    // 无明确关键字：按符号推导
    if (signedAmount !== undefined && signedAmount !== null) {
      if (signedAmount > 0n) return { billType: 'income', neutral: false };
      if (signedAmount < 0n) return { billType: 'expense', neutral: false };
    }
    return { billType: 'neutral', neutral: true };
  }

  // "20260803" -> ISO 日期
  protected toDate(yyyymmdd: string): string {
    const s = String(yyyymmdd).trim();
    if (!s || s === '/') return new Date().toISOString();
    if (s.includes('-') || s.includes('/')) {
      const d = new Date(s);
      return d.toISOString();
    }
    if (/^\d{8}$/.test(s)) {
      const y = s.slice(0, 4);
      const m = s.slice(4, 6);
      const d = s.slice(6, 8);
      return `${y}-${m}-${d}T12:00:00+08:00`;
    }
    return new Date().toISOString();
  }
}