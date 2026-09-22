import { BaseParser } from '../base';
import type { ReducedParse } from '../base';
import type { NormalizedBill } from '../types';
import { decodeText } from '../encoding';

// 支付宝交易明细 CSV（GBK 或 UTF-8）
// 表头(索引24): 交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号,备注
export class AlipayParser extends BaseParser {
  detect(fileName: string): boolean {
    return /支付宝|交易明细/i.test(fileName) || fileName.toLowerCase().endsWith('.csv');
  }

  // 支付宝独有表头列："商品说明"（微信为"商品"）
  identify(rows: unknown[][]): boolean {
    for (let i = 0; i < Math.min(rows.length, 40); i++) {
      const j = String((rows[i] || []).join(','));
      if (j.includes('交易时间') && j.includes('商品说明') && j.includes('交易对方')) return true;
    }
    return false;
  }

  async parse(bytes: Uint8Array, fileName: string, mapping?: Record<string, string>): Promise<ReducedParse> {
    const text = decodeText(bytes);
    const lines = text.split(/\r?\n/);

    // 定位表头行：包含「交易时间,交易分类,交易对方」
    let headerIdx = -1;
    for (let i = 0; i < Math.min(lines.length, 40); i++) {
      if (lines[i].includes('交易时间') && lines[i].includes('交易分类') && lines[i].includes('收/支')) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) {
      throw new Error('无法识别支付宝账单表头（缺少"交易时间,交易分类"列）');
    }

    // 文件头元信息：表头前的信息行（查询时间范围/用户等）
    const headerRows = this.collectHeaderLines(lines, headerIdx);
    // 表尾合计行收集（"支出合计：xxx元"、"共N笔"等）
    const summaryRows: string[] = [];

    const header = lines[headerIdx].split(',');
    const rIdx = (fieldKey: string, defaultName: string) => this.resolveIdx(header, mapping, fieldKey, defaultName);

    const cTime = rIdx('time', '交易时间');
    const cCategory = rIdx('category', '交易分类');
    const cCounterParty = rIdx('counterParty', '交易对方');
    const cCounterpartyAccount = rIdx('counterpartyAccount', '对方账号');
    const cProduct = rIdx('product', '商品说明');
    const cFlow = rIdx('flow', '收/支');
    const cAmount = rIdx('amount', '金额');
    const cPayMethod = rIdx('payMethod', '收/付款方式');
    const cStatus = rIdx('status', '交易状态');
    const cExternalId = rIdx('externalId', '交易订单号');
    const cMerchantNo = rIdx('merchantNo', '商家订单号');

    const bills: NormalizedBill[] = [];
    const skipped: { row: number; reason: string; raw?: unknown }[] = [];
    // 已被命名列覆盖的列名，其余列统一进 extraJson
    const namedCols = new Set(['交易时间', '交易分类', '交易对方', '对方账号', '商品说明', '收/支', '金额', '收/付款方式', '交易状态', '交易订单号', '商家订单号']);

    for (let r = headerIdx + 1; r < lines.length; r++) {
      const line = lines[r].trim();
      if (!line) continue;

      // 表尾合计/汇总行：不产生账单，仅保存进 meta
      if (line.includes('合计') || /^共\s*\d+\s*笔/.test(line)) {
        summaryRows.push(line);
        continue;
      }

      const cols = line.split(',');
      const get = (i: number) => (i >= 0 ? (cols[i] || '').trim() : '');

      const status = get(cStatus);
      if (status === '交易关闭' || status === '') {
        skipped.push({ row: r + 1, reason: status ? `交易状态:${status}，不计入账` : '空行跳过', raw: this.buildRaw(header, cols) });
        continue;
      }

      const flow = get(cFlow);
      const amountRaw = get(cAmount);
      const amountSign = flow === '支出' ? -1 : 1;
      const amountCents = this.toCents(amountRaw) * BigInt(amountSign);

      // 收/支三值：收入/支出/不计收支（基金买卖等按平台原始口径记为不计收支）
      const { billType, neutral } = this.resolveBillType(flow);

      bills.push({
        time: get(cTime),
        amountCents,
        billType,
        neutral,
        sourceCategory: get(cCategory) || undefined,
        remark: get(cProduct) || undefined,
        accountHint: get(cPayMethod) || undefined,
        counterParty: get(cCounterParty) || undefined,
        counterpartyAccount: get(cCounterpartyAccount) || undefined,
        merchantNo: get(cMerchantNo) || undefined,
        payMethod: get(cPayMethod) || undefined,
        status: get(cStatus) || undefined,
        extraJson: this.buildExtra(header, cols, namedCols),
        externalId: get(cExternalId) || undefined,
        rawData: this.buildRaw(header, cols),
      });
    }

    const meta: Record<string, unknown> = { headerRows };
    if (summaryRows.length) meta.summaryRows = summaryRows;

    return { bills, skipped, accountHint: undefined, meta };
  }
}