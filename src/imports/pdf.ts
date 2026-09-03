// PDF FlateDecode 文本流的字节级提取（替代后端 fs+zlib，浏览器端用 pako）
import * as pako from 'pako';

const STREAM = [0x73, 0x74, 0x72, 0x65, 0x61, 0x6d]; // "stream"
const ENDSTREAM = [0x65, 0x6e, 0x64, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d]; // "endstream"

function indexOfBytes(hay: Uint8Array, needle: number[], from: number): number {
  outer: for (let i = from; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

/**
 * 提取 PDF 中所有 FlateDecode stream 的解压内容（latin1 文本）。
 * 语义与后端一致：stream 后（空格,+\r?\n）开始，至第一个 '\r?\nendstream' 前的换行为止；
 * 全程在字节上进行，避免 latin1 字符串往返。
 */
export function extractPdfTextBytes(bytes: Uint8Array): string[] {
  const texts: string[] = [];
  let from = 0;
  for (;;) {
    const s = indexOfBytes(bytes, STREAM, from);
    if (s === -1) break;
    // 跳过 stream 与数据之间的分隔符（空格/制表/\r/\n）
    let p = s + STREAM.length;
    while (p < bytes.length && (bytes[p] === 0x20 || bytes[p] === 0x09 || bytes[p] === 0x0d || bytes[p] === 0x0a)) p++;
    if (p < bytes.length && bytes[p - 1] !== 0x0a) {
      // 非换行结尾（如 "stream<data>" 贴在一起）视为无数据
      from = p;
      continue;
    }
    // 找后续第一个前面带换行的 endstream
    let eEnd = -1;
    let q = p;
    for (;;) {
      const e = indexOfBytes(bytes, ENDSTREAM, q);
      if (e === -1) break;
      if (e >= 1 && (bytes[e - 1] === 0x0a || (bytes[e - 2] === 0x0a && bytes[e - 1] === 0x0d))) {
        eEnd = e;
        break;
      }
      q = e + ENDSTREAM.length;
    }
    if (eEnd !== -1) {
      // 去掉数据尾部紧跟的 \r\n
      let tail = eEnd;
      if (tail > p && bytes[tail - 1] === 0x0a) {
        tail -= 1;
        if (tail > p && bytes[tail - 1] === 0x0d) tail -= 1;
      }
      const raw = bytes.subarray(p, tail);
      try {
        const dec = pako.inflate(raw, { to: 'string' }) as string;
        texts.push(dec);
      } catch {
        // 非 zlib 容器（未压缩等）的 stream，原样保留
        texts.push(bytesToLatin1(raw));
      }
    }
    from = p;
  }
  return texts;
}

function bytesToLatin1(bytes: Uint8Array): string {
  let s = '';
  const CHUNK = 4096;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return s;
}