import * as XLSX from 'xlsx';
import { BaseParser } from '../base';
import type { ReducedParse } from '../base';
import type { NormalizedBill } from '../types';
import { extractPdfTextBytes } from '../pdf';
import { decodeGbk } from '../encoding';

// 建行信用卡交易明细 PDF（文本型）或导出的 Excel
// PDF 表头列: No. T-Date P-Date Card Number Description Trans.Curr/Amt Sett.Curr/Amt
export class CcbCreditParser extends BaseParser {
  private readonly remarkPlaceholder = '【摘要可能缺失，请核对】';

  detect(fileName: string): boolean {
    return /xykmx/i.test(fileName) || (/credit|信用卡/i.test(fileName) && /\.pdf$/i.test(fileName));
  }

  async parse(bytes: Uint8Array, fileName: string): Promise<ReducedParse> {
    const lower = fileName.toLowerCase();
    const bills: NormalizedBill[] = [];
    const skipped: { row: number; reason: string }[] = [];
    let cardNumber: string | undefined;

    if (lower.endsWith('.pdf')) {
      // PDF: 文本流提取（中文摘要无法还原时置空）
      const text = extractPdfTextBytes(bytes).join('\n');
      this.parsePdfText(text, bills, skipped, (v) => (cardNumber = v));
    } else {
      // Excel 兜底
      const wb = XLSX.read(bytes, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
      this.parseRows(rows, bills, skipped, (v) => (cardNumber = v));
    }

    return { bills, skipped, accountHint: cardNumber };
  }

  private parseRows(
    rows: any[][],
    bills: NormalizedBill[],
    skipped: { row: number; reason: string }[],
    onCard?: (v: string) => void,
  ): void {
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const joined = String(rows[i].join(' '));
      if (joined.includes('T-Date') || joined.includes('交易日期')) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) throw new Error('无法识别建行信用卡明细表头');

    const header = rows[headerIdx] || [];
    const joined = String(header.join(' '));

    // 分别处理：Excel 中文表头 或 PDF 英文表头结构性列
    const cNo = joined.includes('No.') ? 0 : -1;
    const cTDate = joined.match(/T-Date/) ? 1 : -1;
    const cDateZh = header.findIndex((h) => String(h).includes('交易日期'));
    const cDescIdx = header.findIndex((h) => String(h).includes('Description') || String(h).includes('摘要'));
    const cTransIdx = header.findIndex((h) => String(h).includes('Trans') || String(h).includes('交易金额'));

    // 无明确列索引时按位置猜测: 0=序号 1=T-Date 4=Description 5=金额
    const iNo = cNo >= 0 ? cNo : 0;
    const iDate = cTDate >= 0 ? cTDate : cDateZh >= 0 ? cDateZh : 1;
    const iDesc = cDescIdx >= 0 ? cDescIdx : 4;
    const iAmt = cTransIdx >= 0 ? cTransIdx : 5;

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every((v) => v === '' || v === null || v === undefined)) continue;
      const get = (i: number) => (i >= 0 && row[i] !== undefined && row[i] !== null ? String(row[i]).trim() : '');
      const no = get(iNo);
      if (!/^\d+$/.test(no)) {
        skipped.push({ row: r + 1, reason: `序号无效(${no})，跳过` });
        continue;
      }
      const amtRaw = get(iAmt);
      const m = amtRaw.match(/([+-]?[\d,]+\.?\d*)/);
      if (!m) {
        skipped.push({ row: r + 1, reason: `金额无效(${amtRaw})` });
        continue;
      }
      const amountCents = this.toCents(m[1]);
      const { billType, neutral } = this.resolveBillType(undefined, amountCents);

      // 卡号: 第一张识别后回调
      const cardMatch = row.find((v) => /^\d+$/.test(String(v || '')) && String(v).length >= 4);
      if (onCard && cardMatch) onCard(String(cardMatch).slice(-4) || String(cardMatch));

      const desc = get(iDesc);
      bills.push({
        time: this.toDate(get(iDate)),
        amountCents,
        billType,
        neutral,
        remark: desc || this.remarkPlaceholder,
        accountHint: undefined,
        externalId: `${get(iDate)}-${no}`,
        rawData: row,
      });
    }
  }

  private parsePdfText(
    text: string,
    bills: NormalizedBill[],
    skipped: { row: number; reason: string }[],
    onCard?: (v: string) => void,
  ): void {
    // 建行信用卡 PDF 为坐标定位文本：每条文本用 "1 0 0 1 x y Tm" 定位 + "(...)Tj" 输出。
    // ASCII 字符以 UTF-16BE(\u0000X) 混排，中文为 GBK 字节。策略：解析坐标后按 y 聚行、按 x 分列重建表格。
    const items: { x: number; y: number; text: string }[] = [];
    let curX = 0;
    let curY = 0;
    for (const line of text.split(/\r?\n/)) {
      let m = line.match(/^1 0 0 1 ([\d.]+) ([\d.]+) Tm$/);
      if (m) {
        curX = parseFloat(m[1]);
        curY = parseFloat(m[2]);
        continue;
      }
      m = line.match(/^\((.+)\)\s*Tj$/);
      if (m) {
        const body = m[1]
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\');
        const bytes: number[] = [];
        for (let i = 0; i < body.length; i++) {
          const code = body.charCodeAt(i);
          if (code === 0 && i + 1 < body.length && body.charCodeAt(i + 1) >= 0x20 && body.charCodeAt(i + 1) < 0x7f) {
            i++;
            bytes.push(body.charCodeAt(i));
          } else {
            bytes.push(code & 0xff);
          }
        }
        items.push({ x: curX, y: curY, text: decodeGbk(new Uint8Array(bytes)) });
      }
    }

    // 按 y 坐标聚行（容差 2pt），行内按 x 排序
    const rows = new Map<number, { x: number; y: number; text: string }[]>();
    for (const it of items) {
      let key = -1;
      for (const k of rows.keys()) {
        if (Math.abs(k - it.y) < 2) {
          key = k;
          break;
        }
      }
      if (key === -1) {
        key = it.y;
        rows.set(key, []);
      }
      rows.get(key)!.push(it);
    }
    const sortedY = [...rows.keys()].sort((a, b) => b - a);

    // 定位表头行（含 No. 与 T-Date），记录各列 x 锚点
    let anchor: number[] = [];
    for (const y of sortedY) {
      const row = rows.get(y)!;
      const joined = row.map((r) => r.text).join(' ');
      if (joined.includes('T-Date') && joined.includes('No.')) {
        anchor = row.map((r) => r.x).sort((a, b) => a - b);
        break;
      }
    }
    if (anchor.length < 6) throw new Error('无法识别建行信用卡 PDF 表头');

    // 数据行：0序号 / 1交易日期 / 2入账日期 / 3卡号 / 4描述 / 5交易金额 / 6记账金额
    // 列分配：No/T-Date/P-Date/卡号/金额 按表头锚点就近窗口匹配，未命中的文本归入描述列
    const windows = [
      { min: -20, max: 20 },
      { min: -20, max: 20 },
      { min: -20, max: 20 },
      { min: -20, max: 20 },
      { min: -9999, max: 9999 },
      { min: -50, max: 50 },
      { min: -50, max: 50 },
    ];
    let cardHint: string | undefined;
    for (const y of sortedY) {
      const row = rows.get(y)!;
      const joined = row.map((r) => r.text).join(' ');
      // 跳过表头行/页眉/页脚
      if (joined.includes('T-Date') || /Transaction Details/i.test(joined)) continue;
      const cells: (string | undefined)[] = anchor.map(() => undefined);
      const unassigned: string[] = [];
      for (const it of row) {
        let assigned = -1;
        let bestDist = Infinity;
        anchor.forEach((hx, i) => {
          if (i === 4) return; // 描述列不参与就近匹配，收集未分配项
          const d = it.x - hx;
          if (d >= windows[i].min && d <= windows[i].max && Math.abs(d) < bestDist) {
            bestDist = Math.abs(d);
            assigned = i;
          }
        });
        if (assigned >= 0) cells[assigned] = (cells[assigned] || '') + it.text;
        else unassigned.push(it.text);
      }
      cells[4] = unassigned.join(' ');
      const no = (cells[0] || '').trim();
      if (!no) {
        skipped.push({ row: Math.round(y), reason: `无序号，跳过` });
        continue;
      }
      const tDate = (cells[1] || '').trim();
      if (!/^\d{8}$/.test(tDate)) {
        skipped.push({ row: Math.round(y), reason: `交易日期无效(${tDate})` });
        continue;
      }
      const amtRaw = (cells[5] || cells[6] || '').trim();
      const amtM = amtRaw.match(/([+-]?[\d,]+\.\d{2})/);
      if (!amtM) {
        skipped.push({ row: Math.round(y), reason: `金额无效(${amtRaw})` });
        continue;
      }
      const amountCents = this.toCents(amtM[1]);
      const desc = (cells[4] || '').trim();
      // 信用卡账单金额无正负号：默认消费(支出)，识别到退款/退货/冲正类摘要时记为收入
      const isRefund = /退款|退货|冲正|撤销|返现|红包/.test(desc);
      const billType: 'income' | 'expense' = isRefund ? 'income' : 'expense';
      const card = (cells[3] || '').match(/[-\s]?(\d{4})$/);
      if (!cardHint && card) cardHint = card[1];
      bills.push({
        time: this.toDate(tDate),
        amountCents,
        billType,
        neutral: false,
        remark: desc || this.remarkPlaceholder,
        externalId: `${tDate}-${no}`,
        rawData: { no, date: tDate },
      });
    }
    if (onCard && cardHint) onCard(cardHint);
  }
}