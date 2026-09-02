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