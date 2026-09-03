// 浏览器本地解析回归验证（Node 环境）：与后端基线（支付宝112/微信64/建行活期18+3/建行信用卡1）对照
// 用法：先在 frontend 安装依赖（pnpm add xlsx@0.18.5 pako），再运行 node scripts/verify-parse.mjs
import { build } from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const docs = path.resolve(root, '../../docs', '入账示例');
const bundleOut = path.join(root, 'scripts', '.parse-bundle.mjs');

// 1. 用 esbuild 把前端解析器打包为 Node ESM
await build({
  entryPoints: [path.join(root, 'src/imports/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundleOut,
  logLevel: 'error',
  external: [],
});

const { parseBillFile } = await import(bundleOut);
fs.rmSync(bundleOut, { force: true });

// 伪 File：Node 无 File，parseBillFile 仅用到 name 与 arrayBuffer
const fakeFile = (name, absPath) => ({ name, arrayBuffer: async () => fs.readFileSync(absPath) });

const cases = [
  ['支付宝 CSV', '支付宝交易明细(20260801-20260831).csv', 112],
  ['微信 XLSX', '微信支付账单流水文件(20260801-20260831)_20260902121319.xlsx', 64],
  ['建行活期1', 'hqmx_20260902133800/hqmx_20260902133800.xls', undefined],
  ['建行活期2', 'hqmx_20260902133918/hqmx_20260902133918.xls', undefined],
  ['建行信用卡 PDF', 'xykmx_20260902133648/xykmx_20260902133648.pdf', 1],
];

let fail = 0;
for (const [name, rel, expect] of cases) {
  try {
    const r = await parseBillFile(fakeFile(rel, path.join(docs, rel)));
    const n = r.parse.bills.length;
    const mark = expect === undefined ? '(数量未断言)' : n === expect ? 'OK' : `MISMATCH 期望${expect}`;
    if (expect !== undefined && n !== expect) fail++;
    console.log(`[${mark}] ${name}: 解析 ${n} 笔 (跳过 ${r.parse.skipped.length}) 账户提示: ${r.parse.accountHint || '-'}`);
    for (const b of r.parse.bills.slice(0, 2)) {
      console.log('    ->', JSON.stringify({ t: b.time, amt: b.amountCents, type: b.billType, cat: b.sourceCategory, ext: b.externalId, remark: b.remark }));
    }
  } catch (e) {
    fail++;
    console.log(`[ERR] ${name}: ${e.message}`);
  }
}
console.log(fail ? `\n有 ${fail} 项未通过` : '\n全部通过');
process.exit(fail ? 1 : 0);