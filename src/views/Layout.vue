<template>
  <el-container class="layout">
    <el-aside :width="collapsed ? '64px' : '200px'" class="aside">
      <div class="logo">{{ collapsed ? '账' : '个人账单' }}</div>
      <el-menu :default-active="$route.path" router :collapse="collapsed" class="menu">
        <el-menu-item index="/dashboard"><el-icon><DataLine /></el-icon><span>总览</span></el-menu-item>
        <el-menu-item index="/import"><el-icon><Upload /></el-icon><span>导入账单</span></el-menu-item>
        <el-menu-item index="/bills"><el-icon><List /></el-icon><span>账单明细</span></el-menu-item>
        <el-menu-item index="/stats"><el-icon><PieChart /></el-icon><span>统计分析</span></el-menu-item>
        <el-menu-item index="/categories"><el-icon><Collection /></el-icon><span>分类管理</span></el-menu-item>
        <el-menu-item index="/accounts"><el-icon><Wallet /></el-icon><span>账户管理</span></el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="collapsed = !collapsed"><Expand v-if="collapsed" /><Fold v-else /></el-icon>
          <span class="page-title">{{ $route.meta.title || '' }}</span>
        </div>
        <div class="header-right">
          <span class="username">{{ store.user?.username }}</span>
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
import { DataLine, Upload, List, PieChart, Collection, Wallet, Expand, Fold } from '@element-plus/icons-vue';
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
.logo { height: 56px; line-height: 56px; text-align: center; font-size: 16px; font-weight: 600; color: #4B3FE3; white-space: nowrap; overflow: hidden; }
.menu { border-right: none; }
.header { background: #fff; border-bottom: 1px solid #e8e8e8; display: flex; align-items: center; justify-content: space-between; }
.header-left { display: flex; align-items: center; gap: 12px; }
.collapse-btn { cursor: pointer; font-size: 18px; }
.page-title { font-size: 16px; font-weight: 600; }
.header-right { display: flex; align-items: center; gap: 12px; }
.username { color: #666; }
.main { padding: 16px; overflow-y: auto; }
</style>