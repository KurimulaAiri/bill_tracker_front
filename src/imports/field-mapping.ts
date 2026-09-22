// 各来源可配置字段清单：key=语义字段名，label=账单页/账单详情中展示的名称，defaultColumn=系统默认列名（未配置时兜底）
export interface FieldDef {
  key: string;
  label: string;
  defaultColumn: string;
}

export const SOURCE_FIELD_DEFS: Record<string, FieldDef[]> = {
  alipay: [
    { key: 'time', label: '时间', defaultColumn: '交易时间' },
    { key: 'category', label: '分类', defaultColumn: '交易分类' },
    { key: 'counterParty', label: '对方', defaultColumn: '交易对方' },
    { key: 'counterpartyAccount', label: '对方账号', defaultColumn: '对方账号' },
    { key: 'product', label: '备注（商品说明）', defaultColumn: '商品说明' },
    { key: 'flow', label: '收支', defaultColumn: '收/支' },
    { key: 'amount', label: '金额', defaultColumn: '金额' },
    { key: 'payMethod', label: '收/付款方式', defaultColumn: '收/付款方式' },
    { key: 'status', label: '交易状态', defaultColumn: '交易状态' },
    { key: 'externalId', label: '交易订单号', defaultColumn: '交易订单号' },
    { key: 'merchantNo', label: '商户单号', defaultColumn: '商家订单号' },
    { key: 'remark', label: '备注', defaultColumn: '备注' },
  ],
  wechat: [
    { key: 'time', label: '时间', defaultColumn: '交易时间' },
    { key: 'type', label: '交易类型', defaultColumn: '交易类型' },
    { key: 'counterParty', label: '对方', defaultColumn: '交易对方' },
    { key: 'product', label: '备注（商品）', defaultColumn: '商品' },
    { key: 'flow', label: '收支', defaultColumn: '收/支' },
    { key: 'amount', label: '金额', defaultColumn: '金额(元)' },
    { key: 'payMethod', label: '收/付款方式', defaultColumn: '支付方式' },
    { key: 'status', label: '交易状态', defaultColumn: '当前状态' },
    { key: 'externalId', label: '交易订单号', defaultColumn: '交易单号' },
    { key: 'merchantNo', label: '商户单号', defaultColumn: '商户单号' },
    { key: 'remark', label: '备注', defaultColumn: '备注' },
  ],
  ccb_saving: [
    { key: 'seq', label: '序号', defaultColumn: '序号' },
    { key: 'summary', label: '备注', defaultColumn: '摘要' },
    { key: 'date', label: '时间', defaultColumn: '交易日期' },
    { key: 'amount', label: '金额', defaultColumn: '交易金额' },
    { key: 'counterParty', label: '对方', defaultColumn: '对方账号与户名' },
    { key: 'balance', label: '账户余额', defaultColumn: '账户余额' },
  ],
  ccb_credit: [
    { key: 'no', label: '序号', defaultColumn: 'No.' },
    { key: 'tDate', label: '时间', defaultColumn: 'T-Date' },
    { key: 'pDate', label: '入账日期', defaultColumn: 'P-Date' },
    { key: 'card', label: '卡号', defaultColumn: 'Card Number' },
    { key: 'description', label: '备注', defaultColumn: 'Description' },
    { key: 'transAmount', label: '金额', defaultColumn: 'Trans.Curr/Amt' },
    { key: 'settleAmount', label: '记账金额', defaultColumn: 'Sett.Curr/Amt' },
  ],
};

export const SOURCE_LABELS: Record<string, string> = {
  alipay: '支付宝',
  wechat: '微信',
  ccb_saving: '建行活期',
  ccb_credit: '建行信用卡',
  export: '本地导出',
};