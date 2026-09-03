import request from '../utils/request';

export function fetchBills(params: any) {
  return request.get('/bills', { params });
}

export function createBill(data: any) {
  return request.post('/bills', data);
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