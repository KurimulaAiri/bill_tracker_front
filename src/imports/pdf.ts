// PDF FlateDecode 文本流提取（与后端逻辑逐字节等价：latin1 字符串 + 正则 + zlib/pako 解压）
import * as pako from 'pako';
import { bytesToLatin1 } from './encoding';

function latin1ToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

/**
 * 提取 PDF 中所有 FlateDecode stream 的解压内容（latin1 文本）。
 * 与后端一致：正则 `/stream\r?\n([\s\S]*?)\r?\nendstream/g` 提取；
 * 解压失败的流（非 zlib 容器等）原样保留其文本。
 */
export function extractPdfTexts(bytes: Uint8Array): string[] {
  const content = bytesToLatin1(bytes);
  const texts: string[] = [];
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const raw = m[1];
    try {
      const dec = pako.inflate(latin1ToBytes(raw));
      texts.push(bytesToLatin1(dec));
    } catch {
      // 非 zlib 容器（未压缩等）的 stream，原样保留
      texts.push(raw);
    }
  }
  return texts;
}