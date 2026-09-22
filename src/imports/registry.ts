import type { Parser } from './types';
import { AlipayParser } from './parsers/alipay.parser';
import { WechatParser } from './parsers/wechat.parser';
import { CcbSavingParser } from './parsers/ccb-saving.parser';
import { CcbCreditParser } from './parsers/ccb-credit.parser';
import { ExportParser } from './parsers/export.parser';

export interface RegisteredParser {
  source: string;
  parser: Parser;
}

// 顺序即检测优先级（与后端 ParserRegistry 一致）。
// 本地导出需最先检测：其文件名带"账单导出"前缀，特异性最强；
// 否则导出的 .csv 会被支付宝的"任意 .csv"兜底规则误判。
const REGISTRY: RegisteredParser[] = [
  { source: 'export', parser: new ExportParser() },
  { source: 'alipay', parser: new AlipayParser() },
  { source: 'wechat', parser: new WechatParser() },
  { source: 'ccb_saving', parser: new CcbSavingParser() },
  { source: 'ccb_credit', parser: new CcbCreditParser() },
];

export function findParser(fileName: string): RegisteredParser | undefined {
  return REGISTRY.find((p) => p.parser.detect(fileName));
}

// 内容识别：按文件内容（表头特征列）挑选解析器，不依赖文件名；无命中返回 undefined
export function findParserByContent(rows: unknown[][]): RegisteredParser | undefined {
  return REGISTRY.find((p) => p.parser.identify?.(rows));
}