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

/** 十六进制串按 UTF-16BE 解码（一个字形可能映射到多个字符，如连字） */
function hexToUnicode(hex: string): string {
  let s = '';
  const h = hex.length % 4 === 0 ? hex : hex.padStart(Math.ceil(hex.length / 4) * 4, '0');
  for (let i = 0; i + 4 <= h.length; i += 4) {
    s += String.fromCharCode(parseInt(h.slice(i, i + 4), 16));
  }
  return s;
}

/**
 * 解析 PDF 内嵌的 ToUnicode CMap（CID -> Unicode）。
 *
 * 建行信用卡明细 PDF 存在两种字体形态：
 * 1) `/Encoding /UniGB-UCS2-H`：文本本身即 UTF-16BE，可直接解码；
 * 2) `/Encoding /Identity-H` + `/ToUnicode`：文本是**子集字体的字形号(CID)**，与字符编码无关
 *    （例如该字体里 'A' 的 CID 可能是 0x0024），必须查 CMap 才能还原，否则解出的是乱码。
 *
 * 同一 PDF 内若有多套 CMap 会被合并；本函数面向单字体（F1）的建行账单，够用。
 */
export function buildToUnicodeMap(texts: string[]): Map<number, string> | null {
  const map = new Map<number, string>();
  for (const block of texts) {
    if (!block.includes('begincmap')) continue;

    // beginbfchar：<src> <dst>
    for (const cb of block.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
      for (const pair of cb[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
        map.set(parseInt(pair[1], 16), hexToUnicode(pair[2]));
      }
    }

    // beginbfrange：<lo> <hi> <dst>  或  <lo> <hi> [<d1> <d2> ...]
    for (const rb of block.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
      const lineRe = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(?:<([0-9a-fA-F]+)>|\[([\s\S]*?)\])/g;
      for (const rm of rb[1].matchAll(lineRe)) {
        const lo = parseInt(rm[1], 16);
        const hi = parseInt(rm[2], 16);
        if (!(hi >= lo) || hi - lo > 0xffff) continue;
        if (rm[3] !== undefined) {
          // 目标码位连续递增（取低 16 位作为起始码位）
          const base = parseInt(rm[3].slice(-4), 16);
          for (let c = lo; c <= hi; c++) map.set(c, String.fromCharCode(base + (c - lo)));
        } else {
          const list = [...String(rm[4]).matchAll(/<([0-9a-fA-F]+)>/g)].map((x) => hexToUnicode(x[1]));
          for (let c = lo; c <= hi; c++) map.set(c, list[c - lo] ?? '');
        }
      }
    }
  }
  return map.size ? map : null;
}
