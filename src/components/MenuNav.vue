<template>
  <el-menu :default-active="$route.path" router :collapse="collapsed" class="menu" @select="$emit('select')">
    <el-menu-item index="/dashboard"><el-icon><font-awesome-icon icon="chart-line" /></el-icon><span>总览</span></el-menu-item>
    <el-menu-item index="/import"><el-icon><font-awesome-icon icon="file-import" /></el-icon><span>导入账单</span></el-menu-item>
    <el-menu-item index="/bills"><el-icon><font-awesome-icon icon="list" /></el-icon><span>账单明细</span></el-menu-item>
    <el-menu-item index="/stats"><el-icon><font-awesome-icon icon="chart-pie" /></el-icon><span>统计分析</span></el-menu-item>
    <el-menu-item index="/categories"><el-icon><font-awesome-icon icon="tags" /></el-icon><span>分类管理</span></el-menu-item>
    <el-menu-item index="/field-mappings"><el-icon><font-awesome-icon icon="sliders" /></el-icon><span>字段映射</span></el-menu-item>
    <el-menu-item index="/accounts"><el-icon><font-awesome-icon icon="wallet" /></el-icon><span>账户管理</span></el-menu-item>
  </el-menu>
</template>

<script setup lang="ts">
defineProps<{ collapsed?: boolean }>();
defineEmits<{ select: [] }>();
</script>

<style scoped>
.menu { border-right: none; }
</style>