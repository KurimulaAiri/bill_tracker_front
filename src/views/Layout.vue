<template>
  <el-container class="layout" :style="{ '--aside-offset': asideOffset + 'px' }">
    <!-- 桌面端：固定侧边栏 -->
    <el-aside v-if="!isMobile" :width="collapsed ? '64px' : '200px'" class="aside">
      <div class="logo">{{ collapsed ? '账' : '个人账单' }}</div>
      <MenuNav :collapsed="collapsed" @select="onNavSelect" />
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon v-if="isMobile" class="hamburger" @click="drawerOpen = true">
            <font-awesome-icon icon="bars" />
          </el-icon>
          <el-icon v-else class="collapse-btn" @click="collapsed = !collapsed">
            <font-awesome-icon v-if="collapsed" icon="angles-right" />
            <font-awesome-icon v-else icon="angles-left" />
          </el-icon>
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

    <!-- 移动端：汉堡按钮唤起的抽屉菜单 -->
    <el-drawer v-model="drawerOpen" :with-header="false" size="240px" direction="ltr">
      <div class="logo">个人账单</div>
      <MenuNav :collapsed="false" @select="onNavSelect" />
    </el-drawer>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { useMobile } from '../composables/useMobile';
import MenuNav from '../components/MenuNav.vue';

const router = useRouter();
const store = useUserStore();
const collapsed = ref(false);
const drawerOpen = ref(false);
const { isMobile } = useMobile();

// 底部操作栏（BatchActionBar）定位左边距：桌面=侧边栏宽度+16，移动端侧边栏隐藏=0
const asideOffset = computed(() => (isMobile.value ? 16 : (collapsed.value ? 64 : 200) + 16));

function onNavSelect() {
  drawerOpen.value = false;
}

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
.hamburger, .collapse-btn { cursor: pointer; font-size: 18px; }
.page-title { font-size: 16px; font-weight: 600; }
.header-right { display: flex; align-items: center; gap: 12px; }
.username { color: #666; cursor: pointer; }
.username:hover { color: var(--el-color-primary); }
.main { padding: 16px 16px 76px; overflow-y: auto; }
</style>