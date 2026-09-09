import request from '../utils/request';

// 返回 { source: { field: columnName } }
export function fetchFieldMappings() {
  return request.get('/field-mappings');
}

// 保存：mappings = [{ source, field, columnName }]，columnName 为空表示清除该字段配置（回默认）
export function saveFieldMappings(mappings: { source: string; field: string; columnName?: string }[]) {
  return request.put('/field-mappings', { mappings });
}