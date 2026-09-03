import axios from 'axios';
import { ElMessage } from 'element-plus';
import { buildSignature } from './sign';

const baseURL = import.meta.env.VITE_API_BASE || '/api';
const signSecret = import.meta.env.VITE_SIGN_SECRET || '';

const request = axios.create({ baseURL, timeout: 30000 });

request.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 请求签名（所有接口统一签名；账单文件已改为浏览器本地解析，无 multipart 请求）
  if (signSecret) {
    // 路径须与后端 originalUrl 一致（含 baseURL 前缀 /api）
    const fullPath = `${baseURL}${config.url || ''}`;
    const { timestamp, nonce, sign } = await buildSignature({
      method: config.method || 'get',
      path: fullPath,
      query: config.params,
      body: config.data,
      secret: signSecret,
    });
    config.headers['X-Timestamp'] = timestamp;
    config.headers['X-Nonce'] = nonce;
    config.headers['X-Sign'] = sign;
  }
  return config;
});

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else {
      ElMessage.error(error?.response?.data?.message || error.message || '请求失败');
    }
    return Promise.reject(error);
  },
);

export default request;