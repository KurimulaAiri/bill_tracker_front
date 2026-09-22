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
    <el-table v-if="!isMobile" :data="accounts" size="small" row-key="id" :tree-props="{ children: 'children' }" default-expand-all @selection-change="onSelectionChange">
      <el-table-column type="selection" width="44" />
      <el-table-column prop="name" label="账户名称" min-width="160" />
      <el-table-column label="类型" width="110">
        <template #default="{ row }">{{ typeMap[row.type] || row.type }}</template>
      </el-table-column>
      <el-table-column label="余额(元)" width="140">
        <template #default="{ row }">{{ centsToYuan(row.balance || 0) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="130">
        <template #default="{ row }">
          <el-tooltip content="请先删除子账户" placement="top" :disabled="!row.children?.length">
            <el-button link type="danger" size="small" :disabled="!!row.children?.length" @click="remove(row)">删除</el-button>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <!-- 移动端：父/子账户卡片分组，点击父账户头部展开/收起子账户 -->
    <div v-else class="m-card-list">
      <template v-for="parent in accounts.filter((a: any) => !a.parentId)" :key="parent.id">
        <div class="m-card m-parent">
          <div class="m-card-head" @click="toggleExpand(parent)">
            <span class="m-arrow">{{ expandedIds.has(String(parent.id)) ? '▾' : '▸' }}</span>
            <span class="m-name">{{ parent.name }}</span>
            <el-tag size="small">{{ typeMap[parent.type] || parent.type }}</el-tag>
            <span class="m-balance">{{ centsToYuan(parent.balance || 0) }}</span>
          </div>
          <template v-if="expandedIds.has(String(parent.id))">
            <template v-if="parent.children?.length">
              <div v-for="c in parent.children" :key="c.id" class="m-card m-child">
                <span class="m-name">{{ c.name }}</span>
                <el-tag size="small">{{ typeMap[c.type] || c.type }}</el-tag>
                <span class="m-balance">{{ centsToYuan(c.balance || 0) }}</span>
                <el-button link type="danger" size="small" @click="remove(c)">删除</el-button>
              </div>
            </template>
            <div v-else class="m-child-none">暂无子账户</div>
          </template>
        </div>
      </template>
      <el-empty v-if="!accounts.length" description="暂无账户" />
    </div>

    <!-- 底部固定操作栏：批量操作（移动端卡片无多选，隐藏） -->
    <BatchActionBar v-if="!isMobile" :selected-count="selectedRows.length">
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
        <el-form-item label="父账户">
          <el-select v-model="form.parentId" placeholder="不选择则创建顶层账户" clearable style="width: 100%">
            <el-option v-for="a in topAccounts" :key="a.id" :label="a.name" :value="a.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="如 微信/零钱、建设银行/储蓄卡-2891" />
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
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { fetchAccounts, createAccount, deleteAccount, batchDeleteAccounts } from '../api/accounts';
import BatchActionBar from '../components/BatchActionBar.vue';
import { useMobile } from '../composables/useMobile';
import { centsToYuan } from '../utils/format';

const { isMobile } = useMobile();
const typeMap: Record<string, string> = { cash: '现金', bank: '银行卡', alipay: '支付宝', wechat: '微信', credit: '信用卡', other: '其他' };

const accounts = ref<any[]>([]);
const dialogVisible = ref(false);
const form = reactive<{ name: string; type: string; parentId?: string }>({ name: '', type: 'bank', parentId: undefined });
const filters = reactive<{ type?: string; keyword?: string }>({});
const selectedRows = ref<any[]>([]);
// 移动端：展开的父账户 id 集合
const expandedIds = ref<Set<string>>(new Set());

function toggleExpand(row: any) {
  const id = String(row.id);
  const next = new Set(expandedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedIds.value = next;
}

// 顶层账户（父账户下拉使用）：children 空的顶层账户
const topAccounts = computed(() => accounts.value.filter((a) => !a.parentId));

function onSelectionChange(rows: any[]) {
  selectedRows.value = rows;
}

async function load() {
  const params: any = {};
  if (filters.type) params.type = filters.type;
  if (filters.keyword && filters.keyword.trim()) params.keyword = filters.keyword.trim();
  accounts.value = (await fetchAccounts(params)) as unknown as any[];
  // 移动端卡片默认展开所有有子账户的父账户
  const next = new Set<string>();
  for (const a of accounts.value) {
    if (a.children?.length) next.add(String(a.id));
  }
  expandedIds.value = next;
}

async function submit() {
  if (!form.name) { ElMessage.warning('请输入账户名称'); return; }
  await createAccount({ name: form.name, type: form.type, parentId: form.parentId });
  ElMessage.success('已创建');
  dialogVisible.value = false;
  form.name = '';
  form.parentId = undefined;
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

/* 移动端卡片 */
.m-card-head { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.m-arrow { color: #909399; font-size: 12px; }
.m-name { font-weight: 600; font-size: 14px; }
.m-balance { margin-left: auto; color: #606266; font-size: 13px; }
.m-parent .m-card-head { border-bottom: 1px solid #f2f3f5; padding-bottom: 8px; }
.m-child { margin-left: 8px; display: flex; align-items: center; gap: 8px; }
.m-child .m-name { font-weight: 400; }
.m-child .m-balance { margin-left: auto; margin-right: 4px; }
.m-child-none { color: #c0c4cc; font-size: 12px; padding: 6px 0 2px 8px; }
</style>