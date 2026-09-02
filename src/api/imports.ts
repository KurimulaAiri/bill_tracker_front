import request from '../utils/request';

export function uploadBillFile(file: File) {
  const form = new FormData();
  form.append('file', file);
  return request.post('/imports/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
}

export function confirmImport(payload: any) {
  return request.post('/imports/confirm', payload);
}

export function fetchBatches() {
  return request.get('/imports/batches');
}

export function fetchBatchDetail(id: string) {
  return request.get(`/imports/batches/${id}`);
}