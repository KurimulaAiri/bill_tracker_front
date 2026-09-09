<template>
  <el-card class="fm-card">
    <template #header>
      <div class="fm-header">
        <span>字段映射配置</span>
        <div>
          <el-button size="small" @click="resetAll">恢复默认</el-button>
          <el-button type="primary" size="small" :loading="saving" @click="save">保存配置</el-button>
        </div>
      </div>
    </template>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="配置各来源账单文件表头列名与系统字段的对应关系；留空表示使用系统默认列名"
      style="margin-bottom: 12px"
    />

    <el-tabs v-model="activeSource">
      <el-tab-pane v-for="(defs, source) in SOURCE_FIELD_DEFS" :key="source" :label="SOURCE_LABELS[source] || source" :name="source">
        <el-table :data="defs" size="small" border>
          <el-table-column prop="label" label="账单字段（账单页/详情名称）" width="220" />
          <el-table-column label="来源列名（留空=默认）" min-width="280">
            <template #default="{ row }">
              <el-input
                v-model="formMap[source][row.key]"
                size="small"
                :placeholder="`默认: ${row.defaultColumn}`"
                clearable
              />
            </template>
          </el-table-column>
          <el-table-column label="默认列名" width="180">
            <template #default="{ row }">
              <el-tag size="small" type="info">{{ row.defaultColumn }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <div class="fm-tip">来源表头需完整包含该列名（前后不可有空格）才能被识别</div>
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { fetchFieldMappings, saveFieldMappings } from '../api/field-mappings';
import { SOURCE_FIELD_DEFS, SOURCE_LABELS } from '../imports/field-mapping';

const activeSource = ref('alipay');
const saving = ref(false);
// formMap[source][fieldKey] = 用户填写的列名（字符串，空串=未配置）
const formMap = reactive<Record<string, Record<string, string>>>({});

for (const source of Object.keys(SOURCE_FIELD_DEFS)) {
  formMap[source] = {};
  for (const f of SOURCE_FIELD_DEFS[source]) formMap[source][f.key] = '';
}

async function load() {
  let saved: Record<string, Record<string, string>> = {};
  try {
    saved = (await fetchFieldMappings()) as any;
  } catch {
    saved = {};
  }
  for (const source of Object.keys(SOURCE_FIELD_DEFS)) {
    for (const f of SOURCE_FIELD_DEFS[source]) {
      formMap[source][f.key] = saved[source]?.[f.key] || '';
    }
  }
}

async function save() {
  const mappings: { source: string; field: string; columnName?: string }[] = [];
  for (const source of Object.keys(SOURCE_FIELD_DEFS)) {
    for (const f of SOURCE_FIELD_DEFS[source]) {
      mappings.push({ source, field: f.key, columnName: (formMap[source][f.key] || '').trim() || undefined });
    }
  }
  saving.value = true;
  try {
    await saveFieldMappings(mappings);
    ElMessage.success('已保存，导入账单时生效');
  } finally {
    saving.value = false;
  }
}

async function resetAll() {
  await ElMessageBox.confirm('将清空全部来源的字段映射并恢复系统默认列名，是否继续？', '恢复默认', { type: 'warning' });
  for (const source of Object.keys(SOURCE_FIELD_DEFS)) {
    for (const f of SOURCE_FIELD_DEFS[source]) formMap[source][f.key] = '';
  }
  ElMessage.success('已恢复默认（点击保存后生效）');
}

onMounted(load);
</script>

<style scoped>
.fm-card { border-radius: 12px; }
.fm-header { display: flex; justify-content: space-between; align-items: center; }
.fm-tip { margin-top: 8px; color: #a8abb2; font-size: 12px; }
</style>