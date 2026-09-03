// 浏览器侧编码/解码工具：替代后端的 iconv-lite 与 buffer.toString('latin1')

const UTF8_BOM = [0xef, 0xbb, 0xbf];

/** bytes -> latin1 字符串（逐字节无损映射 U+0000~U+00FF，替代 buf.toString('latin1')） */
export function bytesToLatin1(bytes: Uint8Array): string {
  let s = '';
  const CHUNK = 4096;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return s;
}

/** 自动探测 GBK/UTF-8 并解码文本（支付宝 CSV 无 BOM，需内容级探测） */
export function decodeText(bytes: Uint8Array): string {
  // 1. 有 UTF-8 BOM 则按 UTF-8
  if (bytes.length >= 3 && bytes[0] === UTF8_BOM[0] && bytes[1] === UTF8_BOM[1] && bytes[2] === UTF8_BOM[2]) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }
  // 2. 前 4KB 能严格按 UTF-8 解码 -> UTF-8；否则按 GBK（GBK 双字节序列几乎必然破坏 UTF-8，判别可靠）
  const sample = bytes.subarray(0, Math.min(bytes.length, 4096));
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(sample);
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return new TextDecoder('gbk').decode(bytes);
  }
}

/** bytes -> GBK 字符串（建行信用卡 PDF 中文摘要） */
export function decodeGbk(bytes: Uint8Array): string {
  return new TextDecoder('gbk').decode(bytes);
}