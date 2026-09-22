import type { NormalizedBill, Parser } from './types';

export type { Parser };
export interface ReducedParse {
  bills: NormalizedBill[];
  skipped: { row: number; reason: string; raw?: unknown }[];
  accountHint?: string;
  /** 文件级元信息：表头前携带的信息与表尾汇总（微信昵称/时间范围/笔数汇总等） */
  meta?: Record<string, unknown>;
}

export abstract class BaseParser implements Parser {
  abstract detect(fileName: string): boolean;
  abstract parse(bytes: Uint8Array, fileName: string, mapping?: Record<string, string>): Promise<ReducedParse>;

  // 收集表头之前的非空行（原始头部信息），供 meta 保存
  protected collectHeaderRows(rows: readonly unknown[][], headerIdx: number): string[] {
    const out: string[] = [];
    for (let i = 0; i < headerIdx; i++) {
      const row = rows[i];
      if (!row) continue;
      const line = row
        .map((v) => (v === undefined || v === null ? '' : String(v).trim()))
        .filter(Boolean)
        .join(' ');
      if (line) out.push(line);
    }
    return out;
  }

  protected collectHeaderLines(lines: readonly string[], headerIdx: number): string[] {
    const out: string[] = [];
    for (let i = 0; i < headerIdx; i++) {
      const line = String(lines[i] || '').trim();
      if (line) out.push(line);
    }
    return out;
  }

  // 解析 "键：[值]" 形式的头部行（微信："微信昵称：[KurimulaAiri]"；支持一行多个键值，如 "起始时间：[..] 终止时间：[..]"）
  protected parseBracketFields(lines: readonly string[]): Record<string, string> {
    const fields: Record<string, string> = {};
    for (const line of lines) {
      const re = /([^：:]+)[：:]\s*[\[（(]\s*([^\]]*?)\s*[\]）)]/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(line))) {
        const k = m[1].trim();
        if (k) fields[k] = m[2].trim();
      }
    }
    return fields;
  }

  // 按字段映射取列索引：用户配置的列名（mapping[fieldKey]）优先，其次默认列名，均未命中返回 -1
  protected resolveIdx(header: unknown[], mapping: Record<string, string> | undefined, fieldKey: string, defaultName: string): number {
    const name = mapping?.[fieldKey] || defaultName;
    return header.findIndex((h) => String(h).trim() === name);
  }

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

  // 收集源表单中未被命名列覆盖的其他列（键=源列名，值=原始单元格），空集时返回 undefined
  protected buildExtra(header: unknown[], cols: unknown[], named: Set<string>): Record<string, unknown> | undefined {
    const out: Record<string, unknown> = {};
    for (let i = 0; i < header.length; i++) {
      const name = String(header[i] ?? '').trim();
      if (!name || named.has(name)) continue;
      const v = cols[i];
      out[name] = v === undefined || v === null ? null : String(v);
    }
    return Object.keys(out).length ? out : undefined;
  }

  // 整行原始值：按表头映射该行的所有原始单元格，用于跳过/失败明细展示
  protected buildRaw(header: unknown[], cols: unknown[]): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (let i = 0; i < header.length; i++) {
      const name = String(header[i] ?? '').trim();
      if (!name) continue;
      const v = cols[i];
      out[name] = v === undefined || v === null ? '' : String(v).trim();
    }
    return out;
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