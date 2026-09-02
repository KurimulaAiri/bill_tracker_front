import request from '../utils/request';

export function fetchAccounts() {
  return request.get('/accounts');
}

export function createAccount(data: { name: string; type: string; balance?: number }) {
  return request.post('/accounts', data);
}

export function updateAccount(id: string, data: any) {
  return request.put(`/accounts/${id}`, data);
}

export function deleteAccount(id: string) {
  return request.delete(`/accounts/${id}`);
}