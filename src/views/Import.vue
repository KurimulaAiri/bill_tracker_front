<template>
  <div class="import-page">
    <!-- 步骤1: 上传 -->
    <el-card class="step-card">
      <template #header>1. 上传账单文件</template>
      <el-upload
        drag
        :auto-upload="false"
        :on-change="onFileChange"
        :limit="1"
        accept=".csv,.xlsx,.xls,.pdf"
        :show-file-list="false"
      >
        <el-icon class="upload-icon"><UploadFilled /></el-icon>
        <div class="el-upload__text">拖拽文件到此处，或 <em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">
            支持支付宝账单(.csv)、微信账单(.xlsx)、建行活期明细(.xls)、建行信用卡明细(.pdf)
          </div>
        </template>
      </el-upload>
      <div v-if="selectedFile" class="file-info">
        已选择：{{ selectedFile.name }}
        <el-button type="primary" :loading="parsing" @click="parseFile">开始解析</el-button>
      </div>
      <!-- 解析摘要 -->
      <div v-if="parseData" class="summary">
        <el-tag type="info">来源: {{ sourceLabel(parseData.parse.source) }}</el-tag>
        <el-tag>总笔数: {{ parseData.parse.total }}</el-tag>
        <el-tag type="success">成功解析: {{ parseData.parse.bills.length }}</el-tag>
        <el-tag type="warning">跳过: {{ parseData.parse.skipped.length }}</el-tag>
        <el-tag v-if="parseData.hints.accountHint">账户提示: {{ parseData.hints.accountHint }}</el-tag>
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
            <span :class="row.amountCents < 0 ? 'expense' : 'income'">{{ row.amountCents < 0 ? '-' : '+' }}{{ centsToYuan(Math.abs(Number(row.amountCents))) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="收支" width="80">
          <template #default="{ row }">
            <el-tag :type="row.billType === 'income' ? 'success' : row.billType === 'expense' ? 'danger' : 'info'" size="small">
              {{ row.billType === 'income' ? '收入' : row.billType === 'expense' ? '支出' : '中性' }}
            </el-tag>
          </template>
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
    </el-card>

    <!-- 批次历史 -->
    <el-card class="step-card">
      <template #header>导入批次历史</template>
      <el-table :data="batches" size="small">
        <el-table-column prop="fileName" label="文件名" min-width="200" />
        <el-table-column label="来源" width="120">
          <template #default="{ row }">{{ sourceLabel(row.source) }}</template>
        </el-table-column>
        <el-table-column label="总数" width="80" prop="total" />
        <el-table-column label="成功" width="80" prop="success" />
        <el-table-column label="跳过" width="80" prop="skipped" />
        <el-table-column label="失败" width="80" prop="failed" />
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';
import { uploadBillFile, confirmImport as submitConfirmImport, fetchBatches } from '../api/imports';
import { fetchAccounts } from '../api/accounts';
import { fetchCategories } from '../api/categories';
import { centsToYuan, formatTime } from '../utils/format';

const selectedFile = ref<File | null>(null);
const parsing = ref(false);
const importing = ref(false);
const parseData = ref<any>(null);
const result = ref<any>(null);
const targetAccount = ref<string | null>(null);
const accounts = ref<any[]>([]);
const categories = ref<any[]>([]);
const batches = ref<any[]>([]);

const previewRows = computed(() => (parseData.value ? [...parseData.value.parse.bills] : []));

function onFileChange(file: any) {
  selectedFile.value = file.raw;
  parseData.value = null;
  result.value = null;
}

async function parseFile() {
  if (!selectedFile.value) return;
  parsing.value = true;
  try {
    const res: any = await uploadBillFile(selectedFile.value);
    if (res.error) { ElMessage.error(res.error); return; }
    parseData.value = res;
    result.value = null;
  } finally {
    parsing.value = false;
  }
}

async function onConfirmImport() {
  if (!parseData.value) return;
  importing.value = true;
  try {
    const bills = parseData.value.parse.bills.map((b: any) => ({
      ...b,
      categoryId: b.categoryId || undefined,
    }));
    const res: any = await submitConfirmImport({
      source: parseData.value.parse.source,
      fileName: selectedFile.value?.name || '',
      accountId: targetAccount.value || undefined,
      bills,
    });
    if (res.error) { ElMessage.error(res.error); return; }
    result.value = res;
    parseData.value = null;
    selectedFile.value = null;
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
.file-info { margin-top: 12px; display: flex; align-items: center; gap: 12px; }
.summary { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
.preview-header { display: flex; justify-content: space-between; align-items: center; }
.expense { color: #e6a23c; font-weight: 600; }
.income { color: #67c23a; font-weight: 600; }
</style>