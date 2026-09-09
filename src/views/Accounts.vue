<template>
  <el-card class="accounts-card">
    <template #header>
      <div class="acc-header">
        <div class="filter-bar">
          <el-select v-model="filters.type" placeholder="类型" clearable size="small" style="width: 120px">
            <el-option v-for="(label, key) in typeMap" :key="key" :label="label" :value="key" />
          </el-select>
          <el-input
            v-model="filters.keyword"
            placeholder="账户名称关键词"
            clearable
            size="small"
            style="width: 200px"
            @keyup.enter="load"
          />
          <el-button type="primary" size="small" @click="load">查询</el-button>
        </div>
        <el-button type="primary" size="small" @click="dialogVisible = true">新建账户</el-button>
      </div>
    </template>
    <el-table :data="accounts" size="small" @selection-change="onSelectionChange">
      <el-table-column type="selection" width="44" />
      <el-table-column prop="name" label="账户名称" min-width="160" />
      <el-table-column label="类型" width="110">
        <template #default="{ row }">{{ typeMap[row.type] || row.type }}</template>
      </el-table-column>
      <el-table-column label="余额(元)" width="140">
        <template #default="{ row }">{{ centsToYuan(row.balance || 0) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="90">
        <template #default="{ row }">
          <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 底部固定操作栏：批量操作 -->
    <BatchActionBar :selected-count="selectedRows.length">
      <template #actions>
        <el-tooltip content="批量删除选中的账户" placement="top" :disabled="!selectedRows.length">
          <el-button size="small" type="danger" plain :disabled="!selectedRows.length" @click="batchRemove">
            <el-icon><font-awesome-icon icon="trash-can" /></el-icon>
          </el-button>
        </el-tooltip>
      </template>
    </BatchActionBar>

    <el-dialog v-model="dialogVisible" title="新建账户" width="380px">
      <el-form label-width="70px">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="如 建设银行储蓄卡" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type" style="width: 100%">
            <el-option v-for="(label, key) in typeMap" :key="key" :label="label" :value="key" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { fetchAccounts, createAccount, deleteAccount, batchDeleteAccounts } from '../api/accounts';
import BatchActionBar from '../components/BatchActionBar.vue';
import { centsToYuan } from '../utils/format';

const typeMap: Record<string, string> = { cash: '现金', bank: '银行卡', alipay: '支付宝', wechat: '微信', credit: '信用卡', other: '其他' };

const accounts = ref<any[]>([]);
const dialogVisible = ref(false);
const form = reactive({ name: '', type: 'bank' });
const filters = reactive<{ type?: string; keyword?: string }>({});
const selectedRows = ref<any[]>([]);

function onSelectionChange(rows: any[]) {
  selectedRows.value = rows;
}

async function load() {
  const params: any = {};
  if (filters.type) params.type = filters.type;
  if (filters.keyword && filters.keyword.trim()) params.keyword = filters.keyword.trim();
  accounts.value = (await fetchAccounts(params)) as unknown as any[];
}

async function submit() {
  if (!form.name) { ElMessage.warning('请输入账户名称'); return; }
  await createAccount({ name: form.name, type: form.type });
  ElMessage.success('已创建');
  dialogVisible.value = false;
  form.name = '';
  load();
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确定删除账户「${row.name}」？关联账单将保留但脱离账户`, '提示', { type: 'warning' });
  await deleteAccount(row.id);
  ElMessage.success('已删除');
  load();
}

async function batchRemove() {
  const ids = selectedRows.value.map((r) => r.id);
  if (!ids.length) return;
  const names = selectedRows.value.map((r) => r.name).join('、');
  await ElMessageBox.confirm(`确定删除选中的 ${ids.length} 个账户（${names}）？关联账单将保留但脱离账户`, '批量删除', { type: 'warning' });
  const res: any = await batchDeleteAccounts(ids);
  ElMessage.success(`已删除 ${res.removed} 个账户`);
  selectedRows.value = [];
  load();
}

onMounted(load);
</script>

<style scoped>
.accounts-card { border-radius: 12px; }
.acc-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.filter-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
</style>