// 请求签名工具：HMAC-SHA256，与后端 SignatureGuard 规则一致
// canonical = method\npath\nquery(按键排序)\nbody(JSON递归排序)\ntimestamp\nnonce
// 注意：不用 Web Crypto（crypto.subtle/randomUUID 仅 HTTPS 安全上下文可用），
// 改用纯 JS 的 crypto-js，局域网 HTTP 下同样可用。

import CryptoJS from 'crypto-js';

function sortKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map((i) => (i && typeof i === 'object' ? sortKeys(i) : i));
  if (obj && typeof obj === 'object') {
    const out: Record<string, any> = {};
    for (const k of Object.keys(obj).sort()) {
      out[k] = obj[k] && typeof obj[k] === 'object' ? sortKeys(obj[k]) : obj[k];
    }
    return out;
  }
  return obj;
}

export async function buildSignature(config: {
  method: string;
  path: string;
  query?: Record<string, any>;
  body?: any;
  secret: string;
}): Promise<{ timestamp: string; nonce: string; sign: string }> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

  // 规范化 query：按键排序 k=v 拼接
  const q = config.query || {};
  const queryStr = Object.keys(q)
    .sort()
    .map((k) => {
      const v = (q as any)[k];
      const val = Array.isArray(v) ? v.join(',') : String(v);
      return `${k}=${val}`;
    })
    .join('&');

  // 规范化 body：递归按键排序后 JSON 序列化
  const bodyStr = config.body === undefined || config.body === null ? '' : JSON.stringify(sortKeys(config.body));

  const canonical = [
    config.method.toUpperCase(),
    config.path,
    queryStr,
    bodyStr,
    timestamp,
    nonce,
  ].join('\n');

  const sign = CryptoJS.HmacSHA256(canonical, config.secret).toString(CryptoJS.enc.Hex);
  return { timestamp, nonce, sign };
}