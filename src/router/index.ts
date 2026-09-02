import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('../views/Login.vue'), meta: { public: true } },
    {
      path: '/',
      component: () => import('../views/Layout.vue'),
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', name: 'dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '总览' } },
        { path: 'import', name: 'import', component: () => import('../views/Import.vue'), meta: { title: '导入账单' } },
        { path: 'bills', name: 'bills', component: () => import('../views/Bills.vue'), meta: { title: '账单明细' } },
        { path: 'stats', name: 'stats', component: () => import('../views/Stats.vue'), meta: { title: '统计分析' } },
        { path: 'accounts', name: 'accounts', component: () => import('../views/Accounts.vue'), meta: { title: '账户管理' } },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const token = localStorage.getItem('token');
  if (!to.meta.public && !token) {
    return { path: '/login' };
  }
  if (to.path === '/login' && token) {
    return { path: '/dashboard' };
  }
  return true;
});

export default router;