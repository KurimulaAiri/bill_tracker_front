import * as XLSX from 'xlsx';
import { BaseParser } from '../base';
import type { ReducedParse } from '../base';
import type { NormalizedBill } from '../types';

// 微信支付账单 XLSX
// 表头(索引17): 交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号,商户单号,备注
export class WechatParser extends BaseParser {
  detect(fileName: string): boolean {
    return /微信/.test(fileName) || /WeChat/i.test(fileName);
  }

  // 微信独有表头列："金额(元)"（支付宝为"金额"）
  identify(rows: unknown[][]): boolean {
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const j = String((rows[i] || []).join(','));
      if (j.includes('交易时间') && j.includes('金额(元)') && j.includes('收/支')) return true;
    }
    return false;
  }

  async parse(bytes: Uint8Array, fileName: string, mapping?: Record<string, string>): Promise<ReducedParse> {
    const wb = XLSX.read(bytes, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });

    // 定位表头行：包含「交易时间」「交易类型」「收/支」
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const row = rows[i];
      const joined = String(row.join(','));
      if (joined.includes('交易时间') && joined.includes('交易类型') && joined.includes('收/支')) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) throw new Error('无法识别微信账单表头（缺少"交易时间,交易类型,收/支"列）');

    // 文件头元信息：表头前的信息行（微信昵称/起始时间/终止时间/导出类型/导出时间）
    const headerRows = this.collectHeaderRows(rows, headerIdx);
    const metaFields = this.parseBracketFields(headerRows.filter((l) => l.includes('[') || l.includes('：') || l.includes(':')));

    const header = rows[headerIdx] || [];
    const rIdx = (fieldKey: string, defaultName: string) => this.resolveIdx(header, mapping, fieldKey, defaultName);

    const cTime = rIdx('time', '交易时间');
    const cType = rIdx('type', '交易类型');
    const cCounterParty = rIdx('counterParty', '交易对方');
    const cProduct = rIdx('product', '商品');
    const cFlow = rIdx('flow', '收/支');
    const cAmount = rIdx('amount', '金额(元)');
    const cPayMethod = rIdx('payMethod', '支付方式');
    const cStatus = rIdx('status', '当前状态');
    const cExternalId = rIdx('externalId', '交易单号');
    const cMerchantNo = rIdx('merchantNo', '商户单号');
    const cRemark = rIdx('remark', '备注');

    const bills: NormalizedBill[] = [];
    const skipped: { row: number; reason: string }[] = [];
    // 表尾汇总：共N笔记录 / 收入|支出|中性交易：X笔 YY.YY元
    const mSummary: Record<string, string> = {};
    // 已被命名列覆盖的列名，其余列统一进 extraJson
    const namedCols = new Set(['交易时间', '交易类型', '交易对方', '商品', '收/支', '金额(元)', '支付方式', '当前状态', '交易单号', '商户单号']);

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every((v) => v === '' || v === null || v === undefined)) continue;
      const get = (i: number) => (i >= 0 && row[i] !== undefined && row[i] !== null ? String(row[i]).trim() : '');

      // 表尾汇总行：不产生账单，仅保存进 meta
      const joinedRow = row.map((v) => (v === undefined || v === null ? '' : String(v).trim())).filter(Boolean).join(' ');
      const totalMatch = /^共\s*(\d+)\s*笔记录?$/.exec(joinedRow);
      const typeMatch = /^(收入|支出|中性交易)[：:]\s*(\d+)\s*笔\s*([\d,]+\.\d{2})\s*元?$/.exec(joinedRow);
      if (totalMatch) {
        mSummary['共N笔记录'] = joinedRow;
        continue;
      }
      if (typeMatch) {
        mSummary[typeMatch[1]] = `${typeMatch[2]}笔 ${typeMatch[3]}元`;
        continue;
      }

      const flow = get(cFlow);
      const amountRaw = get(cAmount);
      const amountSign = flow === '支出' ? -1 : 1;
      const amountCents = this.toCents(amountRaw) * BigInt(amountSign);

      const { billType, neutral } = this.resolveBillType(flow);

      // Excel 时间: 可能为字符串或日期对象/序列号
      const rawTime = row[cTime];
      let time: string | Date = String(rawTime);
      if (rawTime instanceof Date) {
        time = rawTime;
      } else if (typeof rawTime === 'number') {
        time = this.excelDateToIso(rawTime);
      }

      // 微信导出时无备注的"备注"列填充占位符 "/"，需忽略；此时回退到商品名
      const remarkRaw = get(cRemark);
      const remark = remarkRaw && remarkRaw !== '/' ? remarkRaw : get(cProduct) || undefined;

      // 交易类型既参与分类映射（sourceCategory），也并入附加列供详情展示
      const type = get(cType) || undefined;
      const extraJson = this.buildExtra(header, row, namedCols) || {};
      if (type) extraJson['交易类型'] = type;

      bills.push({
        time,
        amountCents,
        billType,
        neutral,
        sourceCategory: type,
        remark: remark || undefined,
        accountHint: get(cPayMethod) || undefined,
        counterParty: get(cCounterParty) || undefined,
        merchantNo: get(cMerchantNo) || undefined,
        payMethod: get(cPayMethod) || undefined,
        status: get(cStatus) || undefined,
        extraJson: Object.keys(extraJson).length ? extraJson : undefined,
        externalId: get(cExternalId) || undefined,
        rawData: this.buildRaw(header, row),
      });
    }

    const meta: Record<string, unknown> = { headerRows };
    if (Object.keys(metaFields).length) meta.fields = metaFields;
    if (Object.keys(mSummary).length) meta.summary = mSummary;

    return { bills, skipped, accountHint: undefined, meta };
  }

  protected excelDateToIso(serial: number): string {
    // Excel 序列号 -> ISO 日期时间 (UTC+8)
    const ms = Math.round((serial - 25569) * 86400 * 1000);
    const d = new Date(ms + 8 * 3600 * 1000);
    return d.toISOString().replace('Z', '+08:00');
  }
}