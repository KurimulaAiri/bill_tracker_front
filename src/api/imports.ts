import request from '../utils/request';

// 账单文件已改为浏览器本地解析（见 src/imports），原始文件不再上传服务器

export function confirmImport(payload: any) {
  return request.post('/imports/confirm', payload);
}

export function fetchBatches() {
  return request.get('/imports/batches');
}

export function fetchBatchDetail(id: string) {
  return request.get(`/imports/batches/${id}`);
}

/** 手动去重：清理数据库中重复账单 */
export function dedupeBills() {
  return request.post('/imports/dedupe');
}