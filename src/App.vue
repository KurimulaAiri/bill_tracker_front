<template>
  <el-config-provider>
    <router-view />
  </el-config-provider>
</template>

<script setup lang="ts">
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #app { height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; background: #f5f6f8; }

/* Element Plus 主题色：薄荷绿 #92dcd3 */
:root {
  --el-color-primary: #92dcd3;
  --el-color-primary-light-3: #a8e3dc;
  --el-color-primary-light-5: #bcebe5;
  --el-color-primary-light-7: #d1f2ee;
  --el-color-primary-light-8: #dcf5f2;
  --el-color-primary-light-9: #ebfaf8;
  --el-color-primary-dark-2: #74b0a8;
}

/* 主色背景上的文字用深色，保证可读性 */
.el-button--primary {
  --el-button-text-color: #1d6b5f;
}
.el-button--primary.is-link,
.el-button--primary.is-plain {
  --el-button-text-color: var(--el-color-primary-dark-2);
}
</style>