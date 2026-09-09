import request from '../utils/request';

export function fetchBills(params: any) {
  return request.get('/bills', { params });
}

export function fetchBill(id: string | number) {
  return request.get(`/bills/${id}`);
}

export function createBill(data: any) {
  return request.post('/bills', data);
}

export function updateBill(id: string | number, data: any) {
  return request.put(`/bills/${id}`, data);
}

export function deleteBill(id: string) {
  return request.delete(`/bills/${id}`);
}

export function batchDeleteBills(ids: string[]) {
  return request.post('/bills/batch-delete', { ids });
}

export function deleteBillsByCondition(cond: any) {
  return request.post('/bills/delete-by-condition', cond);
}

// 批处理：按字段包含关键词批量更新（改分类/改账户/删除）
export function batchUpdateBills(data: any) {
  return request.post('/bills/batch-update', data);
}

// 批处理预览：返回匹配总数与抽样记录
export function batchPreviewBills(data: any) {
  return request.post('/bills/batch-preview', data);
}