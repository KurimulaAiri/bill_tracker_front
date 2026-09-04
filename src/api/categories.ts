import request from '../utils/request';

export function fetchCategories() {
  return request.get('/categories');
}

export function createCategory(data: { name: string; type: string; icon?: string }) {
  return request.post('/categories', data);
}

export function updateCategory(id: string | number, data: { name?: string; type?: string; icon?: string; sort?: number }) {
  return request.put(`/categories/${id}`, data);
}

export function deleteCategory(id: string | number) {
  return request.delete(`/categories/${id}`);
}