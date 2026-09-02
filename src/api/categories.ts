import request from '../utils/request';

export function fetchCategories() {
  return request.get('/categories');
}

export function createCategory(data: { name: string; type: string; icon?: string }) {
  return request.post('/categories', data);
}