import request from '../utils/request';

export function fetchCategories() {
  return request.get('/categories');
}

// 来源分类名映射：{ source: 'wechat' | 'alipay' | ..., value: 原始分类名 }
export type CategoryAlias = { source: string; value: string };

export function createCategory(data: { name: string; type: string; icon?: string; sort?: number; aliases?: CategoryAlias[] | null }) {
  return request.post('/categories', data);
}

export function updateCategory(
  id: string | number,
  data: { name?: string; type?: string; icon?: string; sort?: number; aliases?: CategoryAlias[] | null },
) {
  return request.put(`/categories/${id}`, data);
}

export function deleteCategory(id: string | number) {
  return request.delete(`/categories/${id}`);
}