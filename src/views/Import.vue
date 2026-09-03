<template>
  <div class="import-page">
    <!-- 步骤1: 上传 -->
    <el-card class="step-card">
      <template #header>1. 上传账单文件（支持多文件与整个文件夹）</template>
      <el-upload
        drag
        multiple
        :auto-upload="false"
        :on-change="onFilesPicked"
        accept=".csv,.xlsx,.xls,.pdf"
        :show-file-list="false"
      >
        <el-icon class="upload-icon"><UploadFilled /></el-icon>
        <div class="el-upload__text">拖拽文件到此处，或 <em>点击选择文件</em></div>
        <template #tip>
          <div class="el-upload__tip">
            支持支付宝账单(.csv)、微信账单(.xlsx)、建行活期明细(.xls)、建行信用卡明细(.pdf)，可多选<br />
            也可点击下方「选择文件夹」，自动扫描文件夹内所有符合条件的账单文件
          </div>
        </template>
      </el-upload>
      <div class="dir-row">
        <el-button :loading="parsing" @click="dirInput?.click()">选择文件夹</el-button>
        <el-button type="primary" :loading="parsing" :disabled="!selectedFiles.length" @click="parseAll">开始解析</el-button>
      </div>
      <input ref="dirInput" type="file" webkitdirectory multiple accept=".csv,.xlsx,.xls,.pdf" class="hidden-input" @change="onDirPicked" />
      <div v-if="selectedFiles.length" class="file-info">
        <div class="file-list-title">已选择 {{ selectedFiles.length }} 个文件（点击标签 × 可移除）：</div>
        <div class="file-list">
          <el-tag
            v-for="f in selectedFiles"
            :key="`${f.name}-${f.size}-${f.lastModified}`"
            size="small"
            closable
            class="file-tag"
            @close="removeFile(f)"
          ><span class="tag-text" :title="f.name">{{ f.name }}</span></el-tag>
        </div>
      </div>
      <el-alert v-if="skippedFiles.length" type="warning" :closable="false" class="skip-alert">
        <template #title>已跳过 {{ skippedFiles.length }} 个不符合要求的文件：</template>
        <div v-for="(s, i) in skippedFiles" :key="i" class="skip-item">{{ s.name }}：{{ s.reason }}</div>
      </el-alert>
      <!-- 解析摘要 -->
      <div v-if="parseData" class="summary">
        <el-tag type="info">来源: {{ sourceLabel(parseData.parse.source) }}</el-tag>
        <el-tag>总笔数: {{ parseData.parse.total }}</el-tag>
        <el-tag type="success">成功解析: {{ parseData.parse.bills.length }}</el-tag>
        <el-tag type="warning">跳过: {{ parseData.parse.skipped.length }}</el-tag>
      </div>
    </el-card>

    <!-- 步骤2: 预览 -->
    <el-card v-if="parseData" class="step-card">
      <template #header>
        <div class="preview-header">
          <span>2. 预览与确认（{{ parseData.parse.bills.length }} 条）</span>
          <div>
            <el-select v-model="targetAccount" placeholder="选择账户（可留空自动匹配）" clearable style="width: 220px; margin-right: 8px">
              <el-option v-for="a in accounts" :key="a.id" :label="a.name" :value="a.id" />
            </el-select>
            <el-button type="success" :loading="importing" :disabled="!parseData.parse.bills.length" @click="onConfirmImport">确认导入</el-button>
          </div>
        </div>
      </template>
      <el-table :data="previewRows" max-height="460" size="small">
        <el-table-column label="时间" width="150">
          <template #default="{ row }">{{ formatTime(row.time) }}</template>
        </el-table-column>
        <el-table-column label="金额" width="110">
          <template #default="{ row }">
            <span v-if="row.billType === 'expense'" class="expense">-{{ centsToYuan(Math.abs(Number(row.amountCents))) }}</span>
            <span v-else-if="row.billType === 'income'" class="income">+{{ centsToYuan(Math.abs(Number(row.amountCents))) }}</span>
            <span v-else class="neutral-text">{{ centsToYuan(Math.abs(Number(row.amountCents))) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="收支" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.billType === 'income'" type="success" size="small">收入</el-tag>
            <el-tag v-else-if="row.billType === 'expense'" type="danger" size="small">支出</el-tag>
            <span v-else class="neutral-text">不计收支</span>
          </template>
        </el-table-column>
        <el-table-column label="来源" width="90">
          <template #default="{ row }">{{ sourceLabel(row.source) }}</template>
        </el-table-column>
        <el-table-column label="分类" width="160">
          <template #default="{ row }">
            <el-select v-model="row.categoryId" placeholder="选择分类" size="small" clearable>
              <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="Number(c.id)" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="220">
          <template #default="{ row }">
            <el-input v-model="row.remark" size="small" placeholder="可修改备注" />
          </template>
        </el-table-column>
        <el-table-column label="账户提示" width="140">
          <template #default="{ row }">{{ row.accountHint || '-' }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 步骤3: 结果 -->
    <el-card v-if="result" class="step-card">
      <template #header>3. 导入结果</template>
      <el-result icon="success" :title="`导入完成: 成功 ${result.success} 条`" :sub-title="`跳过 ${result.skipped} 条，失败 ${result.failed} 条`" />
      <div v-for="(f, i) in result.files" :key="i" class="result-file">
        <div class="result-file-head">
          <span class="result-file-name" :title="f.fileName">{{ f.fileName }}</span>
          <el-tag type="success" size="small">成功 {{ f.success }}</el-tag>
          <el-tag type="warning" size="small">跳过 {{ f.skipped }}</el-tag>
          <el-tag type="danger" size="small">失败 {{ f.failed }}</el-tag>
        </div>
        <el-collapse v-if="f.fails.length || f.skips.length">
          <el-collapse-item v-if="f.fails.length" :title="`失败明细（${f.fails.length} 条）`">
            <el-table :data="f.fails" size="small" max-height="220">
              <el-table-column label="行号" width="70" prop="rowNo" />
              <el-table-column label="失败原因" prop="reason" />
            </el-table>
          </el-collapse-item>
          <el-collapse-item v-if="f.skips.length" :title="`跳过明细（${f.skips.length} 条）`">
            <el-table :data="f.skips" size="small" max-height="220">
              <el-table-column label="行号" width="70" prop="rowNo" />
              <el-table-column label="跳过原因" prop="reason" />
            </el-table>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-card>

    <!-- 批次历史 -->
    <el-card class="step-card">
      <template #header>
        <div class="preview-header">
          <span>导入批次历史</span>
          <el-button type="warning" plain :loading="deduping" @click="onDedupe">清理重复账单</el-button>
        </div>
      </template>
      <el-table :data="batchGroups" size="small" row-key="id">
        <el-table-column type="expand">
          <template #default="{ row }">
            <el-table :data="row.children" size="small" class="sub-table">
              <el-table-column label="文件名" min-width="220" prop="fileName" />
              <el-table-column label="来源" width="100">
                <template #default="{ row: b }">{{ sourceLabel(b.source) }}</template>
              </el-table-column>
              <el-table-column label="总数" width="70" prop="total" />
              <el-table-column label="成功" width="70" prop="success" />
              <el-table-column label="跳过" width="70" prop="skipped" />
              <el-table-column label="失败" width="70" prop="failed" />
              <el-table-column label="操作" width="90">
                <template #default="{ row: b }">
                  <el-button link type="primary" size="small" @click="viewDetail(b)">查看详情</el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </el-table-column>
        <el-table-column label="文件（批量）" min-width="240">
          <template #default="{ row }">
            <span :title="row.fileNameLabel">{{ row.fileNameLabel }}</span>
          </template>
        </el-table-column>
        <el-table-column label="文件数" width="78">
          <template #default="{ row }">{{ row.fileCount }}</template>
        </el-table-column>
        <el-table-column label="总数" width="70">
          <template #default="{ row }">{{ row.total }}</template>
        </el-table-column>
        <el-table-column label="成功" width="70">
          <template #default="{ row }" >{{ row.success }}</template>
        </el-table-column>
        <el-table-column label="跳过" width="70">
          <template #default="{ row }">{{ row.skipped }}</template>
        </el-table-column>
        <el-table-column label="失败" width="70">
          <template #default="{ row }">{{ row.failed }}</template>
        </el-table-column>
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 批次详情 -->
    <el-dialog v-model="detailVisible" title="导入批次详情" width="640px">
      <el-descriptions v-if="detail" :column="2" border size="small">
        <el-descriptions-item label="文件名" :span="2">{{ detail.batch.fileName }}</el-descriptions-item>
        <el-descriptions-item label="来源">{{ sourceLabel(detail.batch.source) }}</el-descriptions-item>
        <el-descriptions-item label="导入时间">{{ formatTime(detail.batch.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="总笔数">{{ detail.batch.total }}</el-descriptions-item>
        <el-descriptions-item label="成功">{{ detail.batch.success }}</el-descriptions-item>
        <el-descriptions-item label="跳过">{{ detail.batch.skipped }}</el-descriptions-item>
        <el-descriptions-item label="失败">{{ detail.batch.failed }}</el-descriptions-item>
      </el-descriptions>

      <div v-if="detail" class="failure-block">
        <template v-if="detailFails.length">
          <div class="failure-title">
            <el-tag type="danger" size="small">失败明细 {{ detailFails.length }} 条</el-tag>
          </div>
          <el-table :data="detailFails" size="small" max-height="260">
            <el-table-column label="行号" width="80" prop="rowNo" />
            <el-table-column label="失败原因" min-width="160" prop="reason" />
            <el-table-column label="原始数据" min-width="220">
              <template #default="{ row }">
                <span class="raw-cell" :title="JSON.stringify(row.raw)">{{ JSON.stringify(row.raw) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </template>
        <template v-if="detailSkips.length">
          <div class="failure-title" style="margin-top: 12px">
            <el-tag type="warning" size="small">跳过明细 {{ detailSkips.length }} 条</el-tag>
          </div>
          <el-table :data="detailSkips" size="small" max-height="260">
            <el-table-column label="行号" width="80" prop="rowNo" />
            <el-table-column label="跳过原因" min-width="200" prop="reason" />
          </el-table>
        </template>
        <el-empty v-if="!detailFails.length && !detailSkips.length" description="该批次无失败/跳过记录" :image-size="60" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';
import { confirmImport as submitConfirmImport, fetchBatches, dedupeBills, fetchBatchDetail } from '../api/imports';
import { parseBillFile } from '../imports';
import { findParser } from '../imports/registry';
import { fetchAccounts } from '../api/accounts';
import { fetchCategories } from '../api/categories';
import { centsToYuan, formatTime } from '../utils/format';

const selectedFiles = ref<File[]>([]);
const skippedFiles = ref<{ name: string; reason: string }[]>([]);
const dirInput = ref<HTMLInputElement | null>(null);
const parsing = ref(false);
const importing = ref(false);
const parseData = ref<any>(null);
const result = ref<any>(null);
const targetAccount = ref<string | null>(null);
const accounts = ref<any[]>([]);
const categories = ref<any[]>([]);
const batches = ref<any[]>([]);

const previewRows = computed(() => (parseData.value ? [...parseData.value.parse.bills] : []));

// 同一文件判定：名称+大小+修改时间一致视为同一文件（File 对象每次选择都是新实例）
function sameFile(a: File, b: File) {
  return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
}

// 追加文件时自动去重，避免同一文件被重复选中导致重复解析
function appendUnique(files: File[]) {
  const next = [...selectedFiles.value];
  for (const f of files) {
    if (!next.some((e) => sameFile(e, f))) next.push(f);
  }
  selectedFiles.value = next;
}

// 从已选列表移除部分文件
function removeFile(f: File) {
  selectedFiles.value = selectedFiles.value.filter((x) => !sameFile(x, f));
  parseData.value = null;
  result.value = null;
}

// el-upload 多选文件
function onFilesPicked(_file: any, fileList: any[]) {
  appendUnique(fileList.map((f) => f.raw as File));
  parseData.value = null;
  result.value = null;
  skippedFiles.value = [];
}

// 选择整个文件夹：扫描其中所有受支持的账单文件
function onDirPicked(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = input.files ? Array.from(input.files) : [];
  input.value = '';
  if (!files.length) return;
  const matched: File[] = [];
  const skipped: { name: string; reason: string }[] = [];
  let dupCount = 0;
  for (const f of files) {
    if (!findParser(f.name)) {
      skipped.push({ name: f.name, reason: '不支持的文件格式' });
    } else if (selectedFiles.value.some((e) => sameFile(e, f)) || matched.some((m) => sameFile(m, f))) {
      dupCount++;
    } else {
      matched.push(f);
    }
  }
  if (skipped.length || dupCount) {
    ElMessage.warning(`文件夹扫描完成：新增 ${matched.length} 个文件，跳过 ${skipped.length} 个其他文件${dupCount ? `，去重 ${dupCount} 个已选文件` : ''}`);
  }
  appendUnique(matched);
  skippedFiles.value = [...skippedFiles.value, ...skipped];
  parseData.value = null;
  result.value = null;
}

// 逐一在浏览器本地解析所有已选文件，合并预览
async function parseAll() {
  if (!selectedFiles.value.length) return;
  parsing.value = true;
  try {
    const mergedBills: any[] = [];
    const mergedSkipped: { row: number; reason: string; file?: string }[] = [];
    const sources = new Set<string>();
    const failNotes: { name: string; reason: string }[] = [];
    for (const f of selectedFiles.value) {
      const fkey = `${f.name}-${f.size}-${f.lastModified}`;
      try {
        // 浏览器本地解析，原始文件不上传服务器
        const res: any = await parseBillFile(f);
        for (const b of res.parse.bills) mergedBills.push({ ...b, source: res.parse.source, fileKey: fkey, fileName: f.name });
        for (const s of res.parse.skipped) mergedSkipped.push({ ...s, file: f.name, fileKey: fkey });
        sources.add(res.parse.source);
      } catch (e: any) {
        failNotes.push({ name: f.name, reason: e?.message || '解析失败' });
      }
    }
    skippedFiles.value = [...skippedFiles.value, ...failNotes];
    parseData.value = null;
    result.value = null;
    if (!mergedBills.length) {
      if (failNotes.length) ElMessage.warning('没有可导入的账单数据，请检查文件内容');
      return;
    }
    const fileName = selectedFiles.value.length <= 3
      ? selectedFiles.value.map((f) => f.name).join('、')
      : `${selectedFiles.value[0].name} 等 ${selectedFiles.value.length} 个文件`;
    parseData.value = {
      parse: {
        source: [...sources].join('、'),
        fileName,
        total: mergedBills.length,
        bills: mergedBills,
        skipped: mergedSkipped,
      },
      hints: { accountHint: undefined, unknownCategories: [] },
    };
  } finally {
    parsing.value = false;
  }
}

// 按文件逐个入库，跳过明细（解析阶段跳过的状态/格式等）一并传入
async function onConfirmImport() {
  if (!parseData.value) return;
  importing.value = true;
  try {
    // 生成批量会话 ID：同一次批量导入的所有文件共用
    const groupId = `batch_${Date.now()}_${crypto.randomUUID?.()?.slice(0, 8) || Math.random().toString(36).slice(2, 10)}`;
    // 按文件分组
    const fileGroups = new Map<string, any[]>();
    for (const b of parseData.value.parse.bills) {
      const key = b.fileKey || 'default';
      if (!fileGroups.has(key)) fileGroups.set(key, []);
      fileGroups.get(key)!.push(b);
    }
    // 解析阶段跳过的明细：按文件分组
    const skipMap = new Map<string, { rowNo: number; reason: string }[]>();
    for (const s of parseData.value.parse.skipped || []) {
      const key = s.fileKey || 'default';
      if (!skipMap.has(key)) skipMap.set(key, []);
      skipMap.get(key)!.push({ rowNo: s.rowNo, reason: s.reason });
    }
    let totalOk = 0;
    let totalSkip = 0;
    let totalFail = 0;
    let errCount = 0;
    const okFiles: { fileKey: string; fileName: string; batchId: string | number; success: number; skipped: number; failed: number; skips: any[] }[] = [];
    for (const [fileKey, bills] of fileGroups) {
      const first = bills[0];
      const source = first.source || 'manual';
      const fileName = first.fileName || fileKey;
      const cleaned = bills.map((b: any) => {
        const rest = { ...b };
        delete rest.source;
        delete rest.fileKey;
        delete rest.fileName;
        rest.categoryId = b.categoryId || undefined;
        return rest;
      });
      try {
        const res: any = await submitConfirmImport({
          source,
          fileName,
          groupId,
          skips: skipMap.get(fileKey) || [],
          accountId: targetAccount.value || undefined,
          bills: cleaned,
        });
        if (res.error) {
          errCount++;
          ElMessage.error(`${sourceLabel(source)}-${fileName}: ${res.error}`);
          continue;
        }
        totalOk += res.success || 0;
        totalSkip += res.skipped || 0;
        totalFail += res.failed || 0;
        okFiles.push({
          fileKey,
          fileName,
          batchId: res.batchId,
          success: res.success || 0,
          skipped: res.skipped || 0,
          failed: res.failed || 0,
          skips: skipMap.get(fileKey) || [],
        });
      } catch (e: any) {
        errCount++;
        ElMessage.error(`${sourceLabel(source)}-${fileName} 导入失败: ${e?.message || '请求异常'}`);
      }
    }
    // 并行拉取各文件失败明细（kind=fail），用于结果页罗列
    const failsList = await Promise.all(okFiles.map((f) => fetchBatchDetail(String(f.batchId)).catch(() => null)));
    const files = okFiles.map((f, i) => ({
      fileName: f.fileName,
      success: f.success,
      skipped: f.skipped,
      failed: f.failed,
      skips: f.skips,
      fails: (failsList[i]?.failures || []).map((x: any) => ({ rowNo: x.rowNo, reason: x.reason, isSkip: x.kind === 'skip' })),
    }));
    if (errCount) ElMessage.warning(`导入完成：${okFiles.length}/${fileGroups.size} 个文件成功`);
    else ElMessage.success(`导入完成：成功 ${totalOk} 条`);
    result.value = { success: totalOk, skipped: totalSkip, failed: totalFail, files };
    parseData.value = null;
    selectedFiles.value = [];
    skippedFiles.value = [];
    loadBatches();
  } finally {
    importing.value = false;
  }
}

function sourceLabel(s: string) {
  const map: Record<string, string> = { alipay: '支付宝', wechat: '微信', ccb_saving: '建行活期', ccb_credit: '建行信用卡', manual: '手工' };
  return map[s] || s;
}

async function loadBatches() {
  batches.value = (await fetchBatches()) as unknown as any[];
}

// 批次历史：同一次批量导入（groupId 相同）合并为一条，展开显示各文件（批次）
const batchGroups = computed(() => {
  const groups: any[] = [];
  const map = new Map<string, any[]>();
  for (const b of batches.value) {
    if (b.groupId) {
      if (!map.has(b.groupId)) map.set(b.groupId, []);
      map.get(b.groupId)!.push(b);
    } else {
      groups.push({
        id: `b${b.id}`,
        fileNameLabel: b.fileName,
        fileCount: 1,
        children: [b],
        total: b.total,
        success: b.success,
        skipped: b.skipped,
        failed: b.failed,
        createdAt: b.createdAt,
      });
    }
  }
  for (const [gid, list] of map) {
    list.sort((a: any, b: any) => Number(a.id) - Number(b.id));
    const sum = (k: string) => list.reduce((s: number, x: any) => s + (x[k] || 0), 0);
    groups.push({
      id: `g${gid.replace(/[^\w-]/g, '')}`,
      fileNameLabel: list.length > 1 ? `${list[0].fileName} 等 ${list.length} 个文件` : list[0].fileName,
      fileCount: list.length,
      children: list,
      total: sum('total'),
      success: sum('success'),
      skipped: sum('skipped'),
      failed: sum('failed'),
      createdAt: list[list.length - 1].createdAt,
    });
  }
  return groups.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
});

const detailVisible = ref(false);
const detail = ref<any>(null);
// 详情明细按类型分流：失败（kind=fail）与跳过（kind=skip）
const detailFails = computed(() => ((detail.value?.failures || []) as any[]).filter((f) => f.kind !== 'skip'));
const detailSkips = computed(() => ((detail.value?.failures || []) as any[]).filter((f) => f.kind === 'skip'));
async function viewDetail(row: any) {
  detail.value = await fetchBatchDetail(row.id);
  detailVisible.value = true;
}

const deduping = ref(false);
async function onDedupe() {
  const ok = await ElMessageBox.confirm(
    '将按平台交易单号/内容指纹清理重复账单，每类只保留最早一条。是否继续？',
    '确认去重',
    { type: 'warning', confirmButtonText: '去重', cancelButtonText: '取消' },
  ).catch(() => false);
  if (!ok) return;
  deduping.value = true;
  try {
    const res: any = await dedupeBills();
    ElMessage.success(`去重完成：删除 ${res.removed} 条重复记录`);
    loadBatches();
  } finally {
    deduping.value = false;
  }
}

onMounted(async () => {
  accounts.value = (await fetchAccounts()) as unknown as any[];
  categories.value = (await fetchCategories()) as unknown as any[];
  loadBatches();
});
</script>

<style scoped>
.import-page { display: flex; flex-direction: column; gap: 16px; }
.step-card { border-radius: 12px; }
.upload-icon { font-size: 48px; color: #909399; }
.dir-row { margin-top: 12px; display: flex; gap: 8px; }
.hidden-input { display: none; }
.file-info { margin-top: 12px; }
.file-list-title { font-size: 13px; color: #606266; margin-bottom: 6px; }
.file-list { display: flex; flex-wrap: wrap; gap: 6px; }
.file-tag { max-width: 320px; }
.file-tag .el-tag__content { display: inline-flex; align-items: center; min-width: 0; overflow: hidden; }
.tag-text { display: inline-block; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; }
.skip-alert { margin-top: 10px; }
.skip-alert .el-alert__title { margin-bottom: 4px; }
.skip-item { font-size: 12px; color: #e6a23c; line-height: 1.8; }
.summary { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
.preview-header { display: flex; justify-content: space-between; align-items: center; }
.expense { color: #e6a23c; font-weight: 600; }
.income { color: #67c23a; font-weight: 600; }
.neutral-text { color: #a8abb2; font-size: 12px; }
.collapse { border: none; }
.result-file { margin-top: 12px; border-top: 1px dashed #ebeef5; padding-top: 10px; }
.result-file-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.result-file-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; color: #303133; }
.sub-table { margin: 0 24px; }
.failure-block { margin-top: 14px; }
.failure-title { margin-bottom: 8px; }
.raw-cell { display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>