<template>
  <el-card class="categories-card">
    <template #header>
      <div class="cat-header">
        <span>分类管理</span>
        <el-button type="primary" size="small" @click="openCreate">新建分类</el-button>
      </div>
    </template>

    <el-tabs v-model="activeType">
      <el-tab-pane :label="`支出分类(${expenseCats.length})`" name="expense">
        <el-table :data="expenseCats" size="small">
          <el-table-column label="图标" width="90">
            <template #default="{ row }">{{ row.icon || '-' }}</template>
          </el-table-column>
          <el-table-column prop="name" label="分类名称" min-width="160" />
          <el-table-column label="排序" width="80">
            <template #default="{ row }">{{ row.sort }}</template>
          </el-table-column>
          <el-table-column label="归属" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.userId == null" size="small" type="info">系统预置</el-tag>
              <el-tag v-else size="small" type="success">自定义</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="130">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane :label="`收入分类(${incomeCats.length})`" name="income">
        <el-table :data="incomeCats" size="small">
          <el-table-column label="图标" width="90">
            <template #default="{ row }">{{ row.icon || '-' }}</template>
          </el-table-column>
          <el-table-column prop="name" label="分类名称" min-width="160" />
          <el-table-column label="排序" width="80">
            <template #default="{ row }">{{ row.sort }}</template>
          </el-table-column>
          <el-table-column label="归属" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.userId == null" size="small" type="info">系统预置</el-tag>
              <el-tag v-else size="small" type="success">自定义</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="130">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑分类' : '新建分类'" width="380px">
      <el-form label-width="70px">
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio value="expense">支出</el-radio>
            <el-radio value="income">收入</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="如 宠物消费" maxlength="50" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="form.icon" placeholder="可填 emoji 或 key，如 🍜 或 food" maxlength="50" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="999" style="width: 100%" />
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
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../api/categories';

const categories = ref<any[]>([]);
const activeType = ref('expense');
const dialogVisible = ref(false);
const editingId = ref<string | number | null>(null);
const form = reactive({ name: '', type: 'expense', icon: '', sort: 0 });

const expenseCats = computed(() => categories.value.filter((c) => c.type === 'expense'));
const incomeCats = computed(() => categories.value.filter((c) => c.type === 'income'));

async function load() {
  categories.value = (await fetchCategories()) as unknown as any[];
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { name: '', type: activeType.value === 'expense' ? 'expense' : 'income', icon: '', sort: 0 });
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, { name: row.name, type: row.type, icon: row.icon || '', sort: row.sort || 0 });
  dialogVisible.value = true;
}

async function submit() {
  if (!form.name.trim()) { ElMessage.warning('请输入分类名称'); return; }
  const data = { name: form.name.trim(), type: form.type, icon: form.icon.trim() || undefined, sort: form.sort || 0 };
  if (editingId.value != null) {
    await updateCategory(editingId.value, data);
    ElMessage.success('已更新');
  } else {
    await createCategory(data);
    ElMessage.success('已创建');
  }
  dialogVisible.value = false;
  load();
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确定删除分类「${row.name}」？相关账单将保留但变为未分类`, '提示', { type: 'warning' });
  await deleteCategory(row.id);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
</script>

<style scoped>
.categories-card { border-radius: 12px; }
.cat-header { display: flex; justify-content: space-between; align-items: center; }
</style>