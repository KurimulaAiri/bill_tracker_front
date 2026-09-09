<template>
  <el-card class="bills-card">
    <template #header>
      <div class="filter-bar">
        <el-date-picker v-model="range" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" size="small" style="width: 230px" />
        <el-select v-model="filters.billType" placeholder="收支类型" clearable size="small" style="width: 110px">
          <el-option label="收入" value="income" />
          <el-option label="支出" value="expense" />
          <el-option label="中性" value="neutral" />
        </el-select>
        <el-select v-model="filters.source" placeholder="来源" clearable size="small" style="width: 120px">
          <el-option v-for="(label, key) in sourceMap" :key="key" :label="label" :value="key" />
        </el-select>
        <el-select v-model="filters.categoryId" placeholder="分类" clearable size="small" style="width: 130px">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-input
          v-model="filters.keyword"
          placeholder="备注/对方/单号/类型/状态等"
          clearable
          size="small"
          style="width: 200px"
          @keyup.enter="load(1)"
        />
        <el-button type="primary" size="small" @click="load(1)">查询</el-button>
        <div class="spacer" />
        <el-button size="small" @click="batchDialogVisible = true">批处理</el-button>
        <el-button size="small" type="success" @click="dialogVisible = true">手工记账</el-button>
      </div>
    </template>

    <el-table :data="items" size="small" @selection-change="onSelectionChange">
      <el-table-column type="selection" width="44" />
      <el-table-column label="时间" width="160">
        <template #default="{ row }">{{ formatTime(row.billDate) }}</template>
      </el-table-column>
      <el-table-column label="金额" width="120">
        <template #default="{ row }">
          <span v-if="row.billType === 'expense'" class="expense">-{{ centsToYuan(Math.abs(Number(row.amount))) }}</span>
          <span v-else-if="row.billType === 'income'" class="income">+{{ centsToYuan(Math.abs(Number(row.amount))) }}</span>
          <span v-else class="neutral-text">{{ centsToYuan(Math.abs(Number(row.amount))) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="90">
        <template #default="{ row }">
          <el-tag v-if="row.billType === 'income'" type="success" size="small">收入</el-tag>
          <el-tag v-else-if="row.billType === 'expense'" type="danger" size="small">支出</el-tag>
          <span v-else class="neutral-text">不计收支</span>
        </template>
      </el-table-column>
      <el-table-column label="分类" width="120" show-overflow-tooltip>
        <template #default="{ row }">
          <CategoryIcon v-if="row.category?.name" :icon="row.category?.icon" />
          {{ row.category?.name || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="对方" width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ row.counterParty || '-' }}</template>
      </el-table-column>
      <el-table-column label="账户" width="110" show-overflow-tooltip>
        <template #default="{ row }">{{ row.account?.name || '-' }}</template>
      </el-table-column>
      <el-table-column label="来源" width="90">
        <template #default="{ row }">
          <el-tag size="small" type="info">{{ sourceMap[row.source] || row.source }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="批次" width="90">
        <template #default="{ row }">{{ row.importGroupId || '-' }}</template>
      </el-table-column>
      <el-table-column label="备注" min-width="200" prop="note" show-overflow-tooltip />
      <el-table-column label="操作" width="190">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="showDetail(row)">详情</el-button>
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="pager"
      layout="total, prev, pager, next"
      :total="total"
      :page-size="pageSize"
      :current-page="page"
      @current-change="load"
    />

    <!-- 底部固定操作栏：批量操作（按钮居左横排，悬停显示说明） -->
    <BatchActionBar :selected-count="selectedRows.length">
      <template #actions>
        <el-tooltip content="批量删除选中的账单" placement="top" :disabled="!selectedRows.length">
          <el-button size="small" type="danger" plain :disabled="!selectedRows.length" @click="batchDelete">
            <el-icon><font-awesome-icon icon="trash-can" /></el-icon>
          </el-button>
        </el-tooltip>
      </template>
    </BatchActionBar>

    <!-- 账单详情 -->
    <el-dialog v-model="detailVisible" title="账单详情" width="680px" draggable>
      <template v-if="detail">
        <el-descriptions :column="2" border size="small" label-width="110px">
          <el-descriptions-item label="时间" :span="2">{{ formatTime(detail.billDate) }}</el-descriptions-item>
          <el-descriptions-item label="金额">
            <span :class="detail.billType === 'expense' ? 'expense' : detail.billType === 'income' ? 'income' : 'neutral-text'">
              {{ detail.billType === 'expense' ? '-' : detail.billType === 'income' ? '+' : '' }}{{ centsToYuan(Math.abs(Number(detail.amount))) }} 元
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="收支类型">
            <el-tag v-if="detail.billType === 'income'" type="success" size="small">收入</el-tag>
            <el-tag v-else-if="detail.billType === 'expense'" type="danger" size="small">支出</el-tag>
            <span v-else class="neutral-text">不计收支</span>
          </el-descriptions-item>
          <el-descriptions-item label="分类">{{ detail.category?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="账户">{{ detail.account?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="来源">{{ sourceMap[detail.source] || detail.source }}</el-descriptions-item>
          <el-descriptions-item label="来源批次">{{ detail.importGroupId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="批次文件">{{ detail.batchFileName || '-' }}<template v-if="detail.importBatchId">（批次 #{{ detail.importBatchId }}）</template></el-descriptions-item>
          <el-descriptions-item label="交易类型">{{ detail.extraJson?.['交易类型'] || '-' }}</el-descriptions-item>
          <el-descriptions-item label="优惠/减免">{{ detail.extraJson?.['优惠/减免'] || '-' }}</el-descriptions-item>
          <el-descriptions-item label="对方">{{ detail.counterParty || '-' }}</el-descriptions-item>
          <el-descriptions-item label="对方账号">{{ detail.counterpartyAccount || '-' }}</el-descriptions-item>
          <el-descriptions-item label="商户单号">{{ detail.merchantNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="交易订单号">{{ detail.externalId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="交易状态">{{ detail.status || '-' }}</el-descriptions-item>
          <el-descriptions-item label="收/付款方式">{{ detail.payMethod || '-' }}</el-descriptions-item>
          <el-descriptions-item label="卡号">{{ detail.cardNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detail.note || '-' }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="hasRawDetail" class="raw-actions">
          <el-button link type="primary" size="small" @click="showRaw = !showRaw">
            {{ showRaw ? '收起原始 JSON' : '查看原始 JSON' }}
          </el-button>
        </div>
        <template v-if="showRaw">
          <template v-if="detail.extraJson && Object.keys(detail.extraJson).length">
            <h4 class="detail-json-title">附加字段（extraJson）</h4>
            <pre class="detail-json">{{ prettyJson(detail.extraJson) }}</pre>
          </template>
          <template v-if="detail.rawData">
            <h4 class="detail-json-title">原始数据（rawData）</h4>
            <pre class="detail-json">{{ prettyJson(detail.rawData) }}</pre>
          </template>
        </template>
      </template>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="dialogVisible" :title="editId ? '编辑账单' : '手工记账'" width="420px">
      <el-form :model="form" label-width="70px">
        <el-form-item label="类型">
          <el-radio-group v-model="form.billType">
            <el-radio value="expense">支出</el-radio>
            <el-radio value="income">收入</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="金额(元)">
          <el-input-number v-model="form.yuan" :precision="2" :step="1" :min="0.01" style="width: 100%" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.categoryId" placeholder="选择分类" size="small" style="width: 100%">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="Number(c.id)" />
          </el-select>
        </el-form-item>
        <el-form-item label="账户">
          <el-select v-model="form.accountId" placeholder="选择账户" size="small" clearable style="width: 100%">
            <el-option v-for="a in accounts" :key="a.id" :label="a.name" :value="Number(a.id)" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.note" placeholder="备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitBill">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批处理（含条件删除能力） -->
    <el-dialog v-model="batchDialogVisible" title="账单批处理" width="560px" draggable>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="按下方条件筛选账单后批量执行操作；关键词留空则仅按时间/来源/类型/分类筛选"
        style="margin-bottom: 14px"
      />
      <el-form :model="batchForm" label-width="90px">
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="batchForm.range"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            clearable
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="匹配字段">
          <el-select v-model="batchForm.field" style="width: 100%">
            <el-option label="备注" value="note" />
            <el-option label="交易对方" value="counterParty" />
            <el-option label="交易订单号" value="externalId" />
            <el-option label="商户单号" value="merchantNo" />
            <el-option label="交易状态" value="status" />
            <el-option label="收/付款方式" value="payMethod" />
            <el-option label="卡号" value="cardNo" />
            <el-option label="交易类型" value="extraJsonType" />
          </el-select>
        </el-form-item>
        <el-form-item label="包含关键词">
          <el-input v-model="batchForm.keyword" placeholder="留空则不过滤字段内容" clearable />
        </el-form-item>
        <el-form-item label="来源">
          <el-select v-model="batchForm.source" placeholder="全部来源" clearable style="width: 100%">
            <el-option v-for="(label, key) in sourceMap" :key="key" :label="label" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="收支类型">
          <el-select v-model="batchForm.billType" placeholder="全部类型" clearable style="width: 100%">
            <el-option label="收入" value="income" />
            <el-option label="支出" value="expense" />
            <el-option label="中性" value="neutral" />
          </el-select>
        </el-form-item>
        <el-form-item label="当前分类">
          <el-select v-model="batchForm.categoryWhere" placeholder="不限制分类" clearable style="width: 100%">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="String(c.id)" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作">
          <el-radio-group v-model="batchForm.action">
            <el-radio value="category">设置分类</el-radio>
            <el-radio value="account">设置账户</el-radio>
            <el-radio value="delete">删除记录</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="batchForm.action === 'category'" label="目标分类">
          <el-select v-model="batchForm.categoryId" placeholder="选择目标分类" style="width: 100%">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="Number(c.id)" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="batchForm.action === 'account'" label="目标账户">
          <el-select v-model="batchForm.accountId" placeholder="选择目标账户" clearable style="width: 100%">
            <el-option v-for="a in accounts" :key="a.id" :label="a.name" :value="Number(a.id)" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="previewing" @click="runPreview">预览</el-button>
      </template>
    </el-dialog>

    <!-- 批处理预览结果 -->
    <el-dialog v-model="previewVisible" title="批处理预览" width="720px" draggable>
      <template v-if="preview">
        <el-alert :type="preview.action === 'delete' ? 'warning' : 'info'" :closable="false" show-icon style="margin-bottom: 10px">
          <template #title>
            共匹配 <b>{{ preview.total }}</b> 条{{ preview.total > preview.limit ? `，仅展示前 ${preview.limit} 条` : '' }}；
            操作：{{ actionLabel }}<template v-if="preview.action === 'category'"> → {{ preview.categoryName }}</template><template v-else-if="preview.action === 'account'"> → {{ preview.accountName }}</template>
          </template>
        </el-alert>
        <el-table :data="preview.items" size="small" max-height="380">
          <el-table-column label="时间" width="150">
            <template #default="{ row }">{{ formatTime(row.billDate) }}</template>
          </el-table-column>
          <el-table-column label="金额" width="110">
            <template #default="{ row }">
              <span :class="row.billType === 'expense' ? 'expense' : row.billType === 'income' ? 'income' : 'neutral-text'">
                {{ row.billType === 'expense' ? '-' : row.billType === 'income' ? '+' : '' }}{{ centsToYuan(Math.abs(Number(row.amount))) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="对方" width="130" show-overflow-tooltip>
            <template #default="{ row }">{{ row.counterParty || '-' }}</template>
          </el-table-column>
          <el-table-column label="当前" width="130" show-overflow-tooltip>
            <template #default="{ row }">{{ preview.action === 'category' ? (row.category?.name || '未分类') : preview.action === 'account' ? (row.account?.name || '未设置') : row.note || '-' }}</template>
          </el-table-column>
          <el-table-column label="处理后" width="130" show-overflow-tooltip>
            <template #default="{ row }">
              <el-tag v-if="preview.action === 'delete'" type="danger" size="small">将被删除</el-tag>
              <span v-else>{{ preview.action === 'category' ? preview.categoryName : preview.accountName }}</span>
            </template>
          </el-table-column>
        </el-table>
      </template>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button :type="preview?.action === 'delete' ? 'danger' : 'primary'" :loading="executing" @click="confirmExecute">执行</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { fetchBills, fetchBill, createBill, updateBill, deleteBill, batchDeleteBills, batchUpdateBills } from '../api/bills';
import { fetchAccounts } from '../api/accounts';
import { fetchCategories } from '../api/categories';
import CategoryIcon from '../components/CategoryIcon.vue';
import BatchActionBar from '../components/BatchActionBar.vue';
import { centsToYuan, formatTime, yuanToCentsStr } from '../utils/format';

const sourceMap: Record<string, string> = { manual: '手工', alipay: '支付宝', wechat: '微信', ccb_saving: '建行活期', ccb_credit: '建行信用卡' };
const route = useRoute();

const items = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const range = ref<[Date, Date] | null>(null);
const filters = reactive<{ source?: string; categoryId?: string }>({});
const accounts = ref<any[]>([]);
const categories = ref<any[]>([]);
const dialogVisible = ref(false);
const form = reactive({ billType: 'expense', yuan: 0, categoryId: undefined, accountId: undefined, note: '' });
const selectedRows = ref<any[]>([]);
const batchDialogVisible = ref(false);
const batchForm = reactive<{
  range: [string, string] | null;
  field: string;
  keyword?: string;
  source?: string;
  billType?: string;
  categoryWhere?: string;
  action: 'category' | 'account' | 'delete';
  categoryId?: number;
  accountId?: number;
}>({
  range: null,
  field: 'note',
  action: 'category',
});
const previewVisible = ref(false);
const previewing = ref(false);
const executing = ref(false);
const preview = ref<any>(null);
const actionLabel = computed(() => ({ category: '设置分类', account: '设置账户', delete: '删除记录' }[batchForm.action]));
const detailVisible = ref(false);
const detail = ref<any>(null);
const showRaw = ref(false);
const hasRawDetail = computed(() =>
  !!(detail.value && ((detail.value.extraJson && Object.keys(detail.value.extraJson).length) || detail.value.rawData)),
);

async function showDetail(row: any) {
  detail.value = null;
  showRaw.value = false;
  detailVisible.value = true;
  detail.value = (await fetchBill(row.id)) as any;
}

function prettyJson(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function onSelectionChange(rows: any[]) {
  selectedRows.value = rows;
}

async function load(p = 1) {
  page.value = p;
  const params: any = { page: p, pageSize };
  if (filters.source) params.source = filters.source;
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.billType) params.billType = filters.billType;
  if (filters.keyword && filters.keyword.trim()) params.keyword = filters.keyword.trim();
  if (range.value && range.value[0] && range.value[1]) {
    params.start = range.value[0].toISOString();
    params.end = range.value[1].toISOString();
  }
  const res: any = await fetchBills(params);
  items.value = res.items;
  total.value = res.total;
}

// 筛选条件（日期/来源/分类/收支类型/关键词）变更后自动搜索（防抖 300ms）
watch([range, () => filters.source, () => filters.categoryId, () => filters.billType, () => filters.keyword], () => {
  clearTimeout((load as any)._t);
  (load as any)._t = setTimeout(() => load(1), 300);
});

const editId = ref<string | null>(null);

// 打开编辑：将行数据回填到表单
function openEdit(row: any) {
  editId.value = row.id;
  Object.assign(form, {
    billType: row.billType === 'neutral' ? 'expense' : row.billType,
    yuan: Math.abs(Number(row.amount)) / 100,
    categoryId: row.categoryId ? Number(row.categoryId) : undefined,
    accountId: row.accountId ? Number(row.accountId) : undefined,
    note: row.note || '',
  });
  dialogVisible.value = true;
}

async function submitBill() {
  if (!form.yuan || form.yuan <= 0) { ElMessage.warning('请输入金额'); return; }
  const amountCents = Number(yuanToCentsStr(form.yuan));
  const payload = {
    amountCents: form.billType === 'expense' ? -amountCents : amountCents,
    billType: form.billType,
    note: form.note,
    accountId: form.accountId,
    categoryId: form.categoryId,
  };
  if (editId.value) {
    await updateBill(editId.value, payload);
    ElMessage.success('已保存');
  } else {
    await createBill(payload);
    ElMessage.success('记账成功');
  }
  dialogVisible.value = false;
  editId.value = null;
  Object.assign(form, { billType: 'expense', yuan: 0, categoryId: undefined, accountId: undefined, note: '' });
  load(page.value);
}

async function remove(row: any) {
  await ElMessageBox.confirm('确定删除这条账单吗？', '提示', { type: 'warning' });
  await deleteBill(row.id);
  ElMessage.success('已删除');
  load(page.value);
}

async function batchDelete() {
  const ids = selectedRows.value.map((r) => r.id);
  if (!ids.length) return;
  await ElMessageBox.confirm(`确定删除选中的 ${ids.length} 条账单吗？`, '批量删除', { type: 'warning' });
  const res: any = await batchDeleteBills(ids);
  ElMessage.success(`已删除 ${res.removed} 条`);
  selectedRows.value = [];
  load(page.value);
}

// 批处理：预览匹配内容与处理后效果
async function runPreview() {
  const action = batchForm.action;
  if (action === 'category' && !batchForm.categoryId) { ElMessage.warning('请选择目标分类'); return; }
  if (action === 'account' && !batchForm.accountId) { ElMessage.warning('请选择目标账户'); return; }
  previewing.value = true;
  try {
    const params: any = {
      field: batchForm.field,
      keyword: batchForm.keyword?.trim() ? batchForm.keyword.trim() : undefined,
      source: batchForm.source || undefined,
      billType: batchForm.billType || undefined,
      start: batchForm.range && batchForm.range[0] ? `${batchForm.range[0]}T00:00:00+08:00` : undefined,
      end: batchForm.range && batchForm.range[1] ? `${batchForm.range[1]}T23:59:59+08:00` : undefined,
      categoryWhere: batchForm.categoryWhere || undefined,
      action,
      categoryId: action === 'category' ? batchForm.categoryId : undefined,
      accountId: action === 'account' ? batchForm.accountId : undefined,
    };
    const res: any = await batchPreviewBills(params);
    const categoryName = categories.value.find((c: any) => String(c.id) === String(batchForm.categoryId))?.name || '';
    const accountName = accounts.value.find((a: any) => String(a.id) === String(batchForm.accountId))?.name || '';
    preview.value = { ...res, action, categoryName, accountName, params };
    previewVisible.value = true;
  } finally {
    previewing.value = false;
  }
}

// 批处理：二次确认后真正执行
async function confirmExecute() {
  if (!preview.value) return;
  const action = preview.value.action;
  const actionLbl = { category: '设置分类', account: '设置账户', delete: '删除记录' }[action];
  const condDesc = `共 ${preview.value.total} 条`;
  if (action === 'delete') {
    await ElMessageBox.confirm(`将删除匹配的 ${condDesc} 账单，此操作不可恢复。是否继续？`, '批处理-删除', { type: 'warning', confirmButtonText: '确认删除' });
  } else {
    await ElMessageBox.confirm(`将对匹配的 ${condDesc} 账单执行「${actionLbl}」，是否继续？`, '批处理', { type: 'warning' });
  }
  executing.value = true;
  try {
    const res: any = await batchUpdateBills(preview.value.params);
    ElMessage.success(`已对 ${res.affected ?? 0} 条账单执行「${actionLbl}」`);
    previewVisible.value = false;
    batchDialogVisible.value = false;
    preview.value = null;
    Object.assign(batchForm, { range: null, keyword: '', source: undefined, billType: undefined, categoryWhere: undefined, categoryId: undefined, accountId: undefined });
    load(1);
  } finally {
    executing.value = false;
  }
}

onMounted(async () => {
  accounts.value = (await fetchAccounts()) as unknown as any[];
  categories.value = (await fetchCategories()) as unknown as any[];
  // 从 URL 参数应用分类筛选（统计/首页饼图点击跳转）
  if (route.query.categoryId) filters.categoryId = String(route.query.categoryId);
  load(1);
});

// 路由分类参数变化时同步筛选（如从统计页再次点击跳转）
watch(
  () => route.query.categoryId,
  (v) => {
    const next = v ? String(v) : undefined;
    if (next !== filters.categoryId && page.value > 0) {
      filters.categoryId = next;
      load(1);
    }
  },
);
</script>

<style scoped>
.bills-card { border-radius: 12px; }
.filter-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.spacer { flex: 1; }
.pager { margin-top: 12px; justify-content: flex-end; }
.expense { color: #e6a23c; font-weight: 600; }
.income { color: #67c23a; font-weight: 600; }
.neutral-text { color: #a8abb2; font-size: 12px; }
.detail-json-title { margin: 14px 0 6px; font-size: 13px; color: #606266; }
.raw-actions { margin-top: 14px; text-align: right; }
.raw-actions .el-button { padding: 0; }
.detail-json { max-height: 220px; overflow: auto; background: #f5f7fa; border-radius: 6px; padding: 10px; font-size: 12px; line-height: 1.6; margin: 0; white-space: pre-wrap; word-break: break-all; }
</style>