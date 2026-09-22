import request from '../utils/request';

export function fetchAccounts(params?: any) {
  return request.get('/accounts', { params });
}

// parentId: 创建子账户时指向父账户；不传则为顶层账户
export function createAccount(data: { name: string; type: string; balance?: number; parentId?: string }) {
  return request.post('/accounts', data);
}

export function batchDeleteAccounts(ids: string[]) {
  return request.post('/accounts/batch-delete', { ids });
}

export function updateAccount(id: string, data: any) {
  return request.put(`/accounts/${id}`, data);
}

export function deleteAccount(id: string) {
  return request.delete(`/accounts/${id}`);
}