import request from '../utils/request';

export function fetchSummary(params: any) {
  return request.get('/stats/summary', { params });
}

export function fetchCategoryStats(params: any) {
  return request.get('/stats/category', { params });
}

export function fetchTrend(params: any) {
  return request.get('/stats/trend', { params });
}