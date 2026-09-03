import type { Parser } from './types';
import { AlipayParser } from './parsers/alipay.parser';
import { WechatParser } from './parsers/wechat.parser';
import { CcbSavingParser } from './parsers/ccb-saving.parser';
import { CcbCreditParser } from './parsers/ccb-credit.parser';

export interface RegisteredParser {
  source: string;
  parser: Parser;
}

// 顺序即检测优先级（与后端 ParserRegistry 一致）
const REGISTRY: RegisteredParser[] = [
  { source: 'alipay', parser: new AlipayParser() },
  { source: 'wechat', parser: new WechatParser() },
  { source: 'ccb_saving', parser: new CcbSavingParser() },
  { source: 'ccb_credit', parser: new CcbCreditParser() },
];

export function findParser(fileName: string): RegisteredParser | undefined {
  return REGISTRY.find((p) => p.parser.detect(fileName));
}