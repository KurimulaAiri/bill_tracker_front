<template>
  <el-card class="accounts-card">
    <template #header>
      <div class="acc-header">
        <span>账户管理</span>
        <el-button type="primary" size="small" @click="dialogVisible = true">新建账户</el-button>
      </div>
    </template>
    <el-table :data="accounts" size="small">
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
import { fetchAccounts, createAccount, deleteAccount } from '../api/accounts';
import { centsToYuan } from '../utils/format';

const typeMap: Record<string, string> = { cash: '现金', bank: '银行卡', alipay: '支付宝', wechat: '微信', credit: '信用卡', other: '其他' };

const accounts = ref<any[]>([]);
const dialogVisible = ref(false);
const form = reactive({ name: '', type: 'bank' });

async function load() {
  accounts.value = (await fetchAccounts()) as unknown as any[];
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

onMounted(load);
</script>

<style scoped>
.accounts-card { border-radius: 12px; }
.acc-header { display: flex; justify-content: space-between; align-items: center; }
</style>