<template>
  <el-container class="layout" :style="{ '--aside-offset': (collapsed ? 64 : 200) + 16 + 'px' }">
    <el-aside :width="collapsed ? '64px' : '200px'" class="aside">
      <div class="logo">{{ collapsed ? '账' : '个人账单' }}</div>
      <el-menu :default-active="$route.path" router :collapse="collapsed" class="menu">
        <el-menu-item index="/dashboard"><el-icon><font-awesome-icon icon="chart-line" /></el-icon><span>总览</span></el-menu-item>
        <el-menu-item index="/import"><el-icon><font-awesome-icon icon="file-import" /></el-icon><span>导入账单</span></el-menu-item>
        <el-menu-item index="/bills"><el-icon><font-awesome-icon icon="list" /></el-icon><span>账单明细</span></el-menu-item>
        <el-menu-item index="/stats"><el-icon><font-awesome-icon icon="chart-pie" /></el-icon><span>统计分析</span></el-menu-item>
        <el-menu-item index="/categories"><el-icon><font-awesome-icon icon="tags" /></el-icon><span>分类管理</span></el-menu-item>
        <el-menu-item index="/field-mappings"><el-icon><font-awesome-icon icon="sliders" /></el-icon><span>字段映射</span></el-menu-item>
        <el-menu-item index="/accounts"><el-icon><font-awesome-icon icon="wallet" /></el-icon><span>账户管理</span></el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="collapsed = !collapsed"><font-awesome-icon v-if="collapsed" icon="angles-right" /><font-awesome-icon v-else icon="angles-left" /></el-icon>
          <span class="page-title">{{ $route.meta.title || '' }}</span>
        </div>
        <div class="header-right">
          <span class="username" @click="router.push('/profile')">{{ store.user?.username }}</span>
          <el-button link type="danger" @click="logout">退出</el-button>
        </div>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';

const router = useRouter();
const store = useUserStore();
const collapsed = ref(false);

function logout() {
  store.logout();
  router.push('/login');
}
</script>

<style scoped>
.layout { height: 100%; }
.aside { background: #fff; border-right: 1px solid #e8e8e8; transition: width .2s; }
.logo { height: 56px; line-height: 56px; text-align: center; font-size: 16px; font-weight: 600; color: var(--el-color-primary-dark-2); white-space: nowrap; overflow: hidden; }
.menu { border-right: none; }
.header { background: #fff; border-bottom: 1px solid #e8e8e8; display: flex; align-items: center; justify-content: space-between; }
.header-left { display: flex; align-items: center; gap: 12px; }
.collapse-btn { cursor: pointer; font-size: 18px; }
.page-title { font-size: 16px; font-weight: 600; }
.header-right { display: flex; align-items: center; gap: 12px; }
.username { color: #666; cursor: pointer; }
.username:hover { color: var(--el-color-primary); }
.main { padding: 16px 16px 76px; overflow-y: auto; }
</style>