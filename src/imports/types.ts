// 标准化账单中间结构：四种来源解析后的统一输出
export interface NormalizedBill {
  id?: string; // 前端预览用
  time: Date | string; // 交易时间
  amountCents: bigint; // 分，收入为正、支出为负
  billType: 'income' | 'expense' | 'neutral'; // 收支类型
  neutral: boolean; // 中性交易/不计收支
  sourceCategory?: string; // 来源原始分类
  remark?: string; // 备注
  accountHint?: string; // 账户提示（用于自动关联）
  externalId?: string; // 来源交易单号（去重键）
  counterParty?: string; // 交易对方
  rawData?: unknown; // 原始行
}

// 解析结果输出
export interface ParseResult {
  source: string;
  fileName: string;
  total: number;
  bills: NormalizedBill[];
  skipped: { row: number; reason: string }[];
  accountHint?: string; // 文件级账户提示（建行活期卡号等）
}

export interface Parser {
  detect(fileName: string): boolean;
  parse(bytes: Uint8Array, fileName: string): Promise<{
    bills: NormalizedBill[];
    skipped: { row: number; reason: string }[];
    accountHint?: string;
  }>;
}