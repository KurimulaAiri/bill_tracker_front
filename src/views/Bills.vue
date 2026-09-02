<template>
  <el-card class="bills-card">
    <template #header>
      <div class="filter-bar">
        <el-date-picker v-model="range" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" size="small" />
        <el-select v-model="filters.source" placeholder="来源" clearable size="small" style="width: 120px">
          <el-option v-for="(label, key) in sourceMap" :key="key" :label="label" :value="key" />
        </el-select>
        <el-select v-model="filters.categoryId" placeholder="分类" clearable size="small" style="width: 140px">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-button type="primary" size="small" @click="load(1)">查询</el-button>
        <div class="spacer" />
        <el-button size="small" type="success" @click="dialogVisible = true">手工记账</el-button>
      </div>
    </template>

    <el-table :data="items" size="small">
      <el-table-column label="时间" width="160">
        <template #default="{ row }">{{ formatTime(row.billDate) }}</template>
      </el-table-column>
      <el-table-column label="金额" width="120">
        <template #default="{ row }">
          <span :class="row.billType === 'expense' ? 'expense' : 'income'">
            {{ row.billType === 'expense' ? '-' : '+' }}{{ centsToYuan(Math.abs(Number(row.amount))) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="80">
        <template #default="{ row }">
          <el-tag :type="row.billType === 'income' ? 'success' : row.billType === 'expense' ? 'danger' : 'info'" size="small">
            {{ row.billType === 'income' ? '收入' : row.billType === 'expense' ? '支出' : '中性' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="分类" width="100">
        <template #default="{ row }">{{ row.category?.name || '-' }}</template>
      </el-table-column>
      <el-table-column label="账户" width="110">
        <template #default="{ row }">{{ row.account?.name || '-' }}</template>
      </el-table-column>
      <el-table-column label="来源" width="90">
        <template #default="{ row }">
          <el-tag size="small" type="info">{{ sourceMap[row.source] || row.source }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="备注" min-width="200" prop="note" show-overflow-tooltip />
      <el-table-column label="操作" width="90">
        <template #default="{ row }">
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

    <el-dialog v-model="dialogVisible" title="手工记账" width="420px">
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
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { fetchBills, createBill, deleteBill } from '../api/bills';
import { fetchAccounts } from '../api/accounts';
import { fetchCategories } from '../api/categories';
import { centsToYuan, formatTime, yuanToCentsStr } from '../utils/format';

const sourceMap: Record<string, string> = { manual: '手工', alipay: '支付宝', wechat: '微信', ccb_saving: '建行活期', ccb_credit: '建行信用卡' };

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

async function load(p = 1) {
  page.value = p;
  const params: any = { page: p, pageSize };
  if (filters.source) params.source = filters.source;
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (range.value && range.value[0] && range.value[1]) {
    params.start = range.value[0].toISOString();
    params.end = range.value[1].toISOString();
  }
  const res: any = await fetchBills(params);
  items.value = res.items;
  total.value = res.total;
}

async function submitBill() {
  if (!form.yuan || form.yuan <= 0) { ElMessage.warning('请输入金额'); return; }
  const amountCents = Number(yuanToCentsStr(form.yuan));
  await createBill({
    amountCents: form.billType === 'expense' ? -amountCents : amountCents,
    billType: form.billType,
    note: form.note,
    accountId: form.accountId,
    categoryId: form.categoryId,
  });
  ElMessage.success('记账成功');
  dialogVisible.value = false;
  Object.assign(form, { billType: 'expense', yuan: 0, categoryId: undefined, accountId: undefined, note: '' });
  load(page.value);
}

async function remove(row: any) {
  await ElMessageBox.confirm('确定删除这条账单吗？', '提示', { type: 'warning' });
  await deleteBill(row.id);
  ElMessage.success('已删除');
  load(page.value);
}

onMounted(async () => {
  accounts.value = (await fetchAccounts()) as unknown as any[];
  categories.value = (await fetchCategories()) as unknown as any[];
  load(1);
});
</script>

<style scoped>
.bills-card { border-radius: 12px; }
.filter-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.spacer { flex: 1; }
.pager { margin-top: 12px; justify-content: flex-end; }
.expense { color: #e6a23c; font-weight: 600; }
.income { color: #67c23a; font-weight: 600; }
</style>