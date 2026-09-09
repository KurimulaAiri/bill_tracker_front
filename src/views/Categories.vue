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
          <el-table-column label="图标" width="110">
            <template #default="{ row }"><CategoryIcon :icon="row.icon" /></template>
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
          <el-table-column label="操作" width="190">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openAlias(row)">映射</el-button>
              <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane :label="`收入分类(${incomeCats.length})`" name="income">
        <el-table :data="incomeCats" size="small">
          <el-table-column label="图标" width="110">
            <template #default="{ row }"><CategoryIcon :icon="row.icon" /></template>
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
          <el-table-column label="操作" width="190">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openAlias(row)">映射</el-button>
              <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑分类' : '新建分类'" width="480px">
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
          <div class="icon-picker-row">
            <el-input v-model="form.icon" placeholder="fa 图标名或 emoji，如 utensils / 🍜" maxlength="50" clearable />
            <span class="icon-preview"><CategoryIcon :icon="form.icon" /></span>
            <el-button size="small" @click="iconVisible = true">选择</el-button>
          </div>
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

    <!-- 来源分类映射管理 -->
    <el-dialog v-model="aliasVisible" :title="`来源分类映射 - ${aliasTarget?.name || ''}`" width="560px">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="配置后，导入账单时来源分类命中以下映射即自动归入该分类（优先于系统默认映射），未命中才落到「其他」"
        style="margin-bottom: 12px"
      />
      <div v-for="(a, i) in aliasList" :key="i" class="alias-row">
        <el-select v-model="a.source" placeholder="来源" size="small" style="width: 130px">
          <el-option v-for="(label, key) in sourceMap" :key="key" :label="label" :value="key" />
        </el-select>
        <el-input v-model="a.value" placeholder="源分类名，如 商户消费 / 充值缴费" size="small" style="flex: 1" />
        <el-button link type="danger" size="small" @click="aliasList.splice(i, 1)">删除</el-button>
      </div>
      <el-button size="small" type="primary" plain @click="aliasList.push({ source: 'wechat', value: '' })">+ 添加映射</el-button>
      <template #footer>
        <el-button @click="aliasVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAlias">保存映射</el-button>
      </template>
    </el-dialog>

    <!-- 图标选择弹窗 -->
    <el-dialog v-model="iconVisible" title="选择图标" width="720px" align-center>
      <el-input v-model="iconSearch" placeholder="搜索图标（fa 名称，如 car / music）" size="small" clearable style="margin-bottom: 8px" />
      <div class="icon-grid">
        <div
          v-for="name in filteredIcons"
          :key="name"
          class="icon-item"
          :class="{ active: form.icon === name }"
          :title="name"
          @click="pickIcon(name)"
        >
          <CategoryIcon :icon="name" />
        </div>
      </div>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../api/categories';
import CategoryIcon from '../components/CategoryIcon.vue';

const categories = ref<any[]>([]);
const activeType = ref('expense');
const dialogVisible = ref(false);
const editingId = ref<string | number | null>(null);
const form = reactive({ name: '', type: 'expense', icon: '', sort: 0 });
const aliasVisible = ref(false);
const aliasTarget = ref<any>(null);
const aliasList = ref<{ source: string; value: string }[]>([]);
const sourceMap: Record<string, string> = { alipay: '支付宝', wechat: '微信', ccb_saving: '建行活期', ccb_credit: '建行信用卡' };

// 可视化选择的常用 Font Awesome 图标（fa 短名）
const ICON_OPTIONS = [
  'utensils', 'pizza-slice', 'mug-hot', 'cake-candles', 'burger', 'basket-shopping',
  'cart-shopping', 'shirt', 'gift', 'gem', 'bag-shopping',
  'car', 'bus', 'train', 'motorcycle', 'plane', 'gas-pump',
  'house', 'plug', 'bolt', 'lightbulb', 'building', 'tower-broadcast',
  'music', 'gamepad', 'film', 'book', 'dumbbell', 'photo-film',
  'heart-pulse', 'hospital', 'pills', 'stethoscope', 'bandage',
  'mobile-screen', 'phone', 'wifi', 'envelope', 'laptop',
  'paw', 'baby', 'graduation-cap', 'briefcase', 'suitcase',
  'chart-line', 'coins', 'piggy-bank', 'sack-dollar', 'money-bill-trend-up',
  'arrows-rotate', 'right-left', 'money-bill-transfer', 'arrow-right-arrow-left',
  'tag', 'wallet', 'file-invoice-dollar', 'receipt', 'credit-card',
  'circle-dollar-to-slot', 'hand-holding-dollar', 'rotate-left', 'star', 'heart',
];
const iconSearch = ref('');
const iconVisible = ref(false);
// 仅保留 fas 中真实存在的图标，避免无效名渲染为文字（kebab -> Pascal 转换）
const VALID_ICONS = ICON_OPTIONS.filter((n) => {
  const camel = 'fa' + n.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  return !!(fas as any)[n] || !!(fas as any)[camel];
});
const filteredIcons = computed(() => {
  const kw = iconSearch.value.trim().toLowerCase();
  if (!kw) return VALID_ICONS;
  return VALID_ICONS.filter((n) => n.includes(kw));
});

// 选择图标并回填到表单
function pickIcon(name: string) {
  form.icon = name;
  iconVisible.value = false;
}

const expenseCats = computed(() => categories.value.filter((c) => c.type === 'expense'));
const incomeCats = computed(() => categories.value.filter((c) => c.type === 'income'));

async function load() {
  categories.value = (await fetchCategories()) as unknown as any[];
}

function openAlias(row: any) {
  aliasTarget.value = row;
  aliasList.value = Array.isArray(row.aliases) ? row.aliases.map((a: any) => ({ source: a.source, value: a.value })) : [];
  if (!aliasList.value.length) aliasList.value.push({ source: 'wechat', value: '' });
  aliasVisible.value = true;
}

async function saveAlias() {
  if (!aliasTarget.value) return;
  const aliases = aliasList.value.map((a) => ({ source: a.source, value: (a.value || '').trim() })).filter((a) => a.source && a.value);
  await updateCategory(aliasTarget.value.id, { aliases });
  ElMessage.success('映射已保存');
  aliasVisible.value = false;
  load();
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
.alias-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.icon-picker-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.icon-picker-row .el-input { flex: 1; }
.icon-preview { width: 40px; height: 40px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; border: 1px dashed #dcdfe6; border-radius: 6px; font-size: 18px; background: #fff; }
.icon-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 10px; }
.icon-item { width: 56px; height: 48px; display: flex; align-items: center; justify-content: center; border: 1px solid #e4e7ed; border-radius: 6px; cursor: pointer; font-size: 18px; color: #606266; box-sizing: border-box; }
.icon-item:hover { border-color: var(--el-color-primary); color: var(--el-color-primary); }
.icon-item.active { border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
</style>