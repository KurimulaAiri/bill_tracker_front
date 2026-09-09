<template>
  <div class="batch-bar">
    <div class="batch-actions">
      <!-- 批量操作按钮（图标 + 悬停提示）通过插槽注入 -->
      <slot name="actions"></slot>
    </div>
    <span class="batch-tip">{{ selectedCount > 0 ? `已选 ${selectedCount} 条` : (tip || '勾选后进行批量操作') }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ selectedCount?: number; tip?: string }>();
</script>

<style scoped>
.batch-bar {
  position: fixed;
  bottom: 0;
  left: calc(var(--aside-offset, 216px) - 16px);
  right: 0;
  z-index: 10;
  padding: 10px 20px;
  background: #fff;
  border-top: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
}
.batch-actions { display: flex; align-items: center; gap: 8px; }
.batch-tip { font-size: 13px; color: #909399; }
</style>