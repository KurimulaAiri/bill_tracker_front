import * as XLSX from 'xlsx';
import { BaseParser } from '../base';
import type { ReducedParse } from '../base';
import type { NormalizedBill } from '../types';

// 建行活期账户交易明细 XLS
// 表头(索引4): 序号,摘要,币别,钞汇,交易日期,交易金额,账户余额,交易地点/附言,对方账号与户名
export class CcbSavingParser extends BaseParser {
  detect(fileName: string): boolean {
    return /hqmx/i.test(fileName) || (/(银行|活期)/.test(fileName) && fileName.toLowerCase().endsWith('.xls'));
  }

  async parse(bytes: Uint8Array, fileName: string): Promise<ReducedParse> {
    const wb = XLSX.read(bytes, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });

    // 表头行：包含「序号」「摘要」「交易日期」「交易金额」
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 12); i++) {
      const joined = String(rows[i].join(','));
      if (joined.includes('摘要') && joined.includes('交易金额') && joined.includes('交易日期')) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) throw new Error('无法识别建行活期明细表头（缺少"摘要,交易日期,交易金额"列）');

    const header = rows[headerIdx] || [];
    const idx = (name: string) => header.findIndex((h) => String(h).trim() === name);

    const cSummary = idx('摘要');
    const cDate = idx('交易日期');
    const cAmount = idx('交易金额');
    const cCounterParty = idx('对方账号与户名');
    const cBalance = idx('账户余额');
    const cSeq = idx('序号');

    // 从头部找卡号/账号
    let accountHint: string | undefined;
    for (let i = 0; i < headerIdx; i++) {
      const joined = String(rows[i].join(','));
      const m = joined.match(/卡号\/账号[:：]?\s*(\d+)/);
      if (m) accountHint = m[1];
    }

    const bills: NormalizedBill[] = [];
    const skipped: { row: number; reason: string; raw?: unknown }[] = [];
    // 已被命名列覆盖的列名，其余列（币别/钞汇/账户余额/交易地点附言等）统一进 extraJson
    const namedCols = new Set(['序号', '摘要', '交易日期', '交易金额', '对方账号与户名']);

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every((v) => v === '' || v === null || v === undefined)) continue;
      const get = (i: number) => (i >= 0 && row[i] !== undefined && row[i] !== null ? String(row[i]).trim() : '');

      const seq = get(cSeq);
      if (!seq) {
        skipped.push({ row: r + 1, reason: '序号为空，跳过行尾', raw: this.buildRaw(header, row) });
        continue;
      }

      const amountRaw = get(cAmount);
      const amountCents = this.toCents(amountRaw); // 金额本身带符号
      const { billType, neutral } = this.resolveBillType(undefined, amountCents);

      // 对方账号与户名: "6217001930066356917/赵杰" -> 账号在 / 前，户名在 / 后
      const cpRaw = get(cCounterParty);
      let counterparty: string | undefined;
      let counterpartyAccount: string | undefined;
      if (cpRaw && cpRaw !== '/') {
        const parts = cpRaw.split('/');
        counterparty = (parts[parts.length - 1] || '').replace(/\*\*\*/g, '') || undefined;
        if (parts[0]) counterpartyAccount = (parts[0] || '').replace(/\*\*\*/g, '') || undefined;
      }

      bills.push({
        time: this.toDate(get(cDate)),
        amountCents,
        billType,
        neutral,
        sourceCategory: get(cSummary) || undefined,
        remark: get(cSummary) || undefined,
        counterParty: counterparty,
        counterpartyAccount,
        cardNo: accountHint,
        extraJson: this.buildExtra(header, row, namedCols),
        externalId: `${get(cDate)}-${seq}`,
        rawData: row,
      });
    }

    return { bills, skipped, accountHint };
  }
}