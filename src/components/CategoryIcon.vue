<template>
  <font-awesome-icon v-if="iconDef" :icon="iconDef" class="cat-icon" />
  <span v-else-if="rawIcon" class="cat-icon">{{ rawIcon }}</span>
  <span v-else class="cat-icon muted">-</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { fas } from '@fortawesome/free-solid-svg-icons';

// 旧版分类 icon key（seed/存量数据） -> Font Awesome 图标名
const LEGACY_MAP: Record<string, string> = {
  food: 'utensils',
  traffic: 'car',
  shopping: 'bag-shopping',
  fun: 'music',
  home: 'house',
  health: 'heart-pulse',
  invest: 'chart-line',
  transfer: 'arrows-rotate',
  other: 'tag',
  salary: 'sack-dollar',
  refund: 'rotate-left',
  'other-income': 'circle-dollar-to-slot',
};

const props = defineProps<{ icon?: string }>();

// 去除首尾空格后的原始值（emoji/无效名直接按文本展示）
const rawIcon = computed(() => (props.icon || '').trim());

// 纯小写字母/连字符形式：视作 Font Awesome 图标名（含旧 key 的映射）
const faName = computed(() => {
  const v = rawIcon.value;
  if (!v || !/^[a-z0-9-]+$/.test(v)) return '';
  return LEGACY_MAP[v] || v;
});

// 从 fas 包中解析出图标定义（兼容短名 utensils 与 faUtensils 形式），查不到则不渲染图标
const iconDef = computed(() => {
  const n = faName.value;
  if (!n) return undefined;
  // kebab-case -> PascalCase：mug-hot -> faMugHot
  const camel = 'fa' + n.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  return (fas as any)[n] || (fas as any)[camel] || undefined;
});
</script>

<style scoped>
.cat-icon { margin-right: 4px; }
.muted { color: #a8abb2; }
</style>