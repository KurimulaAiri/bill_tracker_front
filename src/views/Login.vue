<template>
  <div class="login-wrap">
    <el-card class="login-card">
      <div class="login-title">个人账单统计</div>
      <el-tabs v-model="mode">
        <el-tab-pane label="登录" name="login">
          <el-form :model="form" label-width="0" @keyup.enter="submit">
            <el-form-item>
              <el-input v-model="form.username" placeholder="用户名" size="large" />
            </el-form-item>
            <el-form-item>
              <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password />
            </el-form-item>
            <el-button type="primary" size="large" class="full-btn" :loading="loading" @click="submit">登 录</el-button>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="注册" name="register">
          <el-form :model="form" label-width="0" @keyup.enter="submit">
            <el-form-item>
              <el-input v-model="form.username" placeholder="用户名（至少3位）" size="large" />
            </el-form-item>
            <el-form-item>
              <el-input v-model="form.password" type="password" placeholder="密码（至少6位）" size="large" show-password />
            </el-form-item>
            <el-form-item>
              <el-input v-model="form.email" placeholder="邮箱（可选）" size="large" />
            </el-form-item>
            <el-button type="primary" size="large" class="full-btn" :loading="loading" @click="submit">注 册</el-button>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { login, register } from '../api/auth';
import { useUserStore } from '../stores/user';

const router = useRouter();
const store = useUserStore();
const mode = ref('login');
const loading = ref(false);
const form = reactive({ username: '', password: '', email: '' });

async function submit() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码');
    return;
  }
  loading.value = true;
  try {
    const res: any = mode.value === 'login' ? await login({ username: form.username, password: form.password }) : await register({ username: form.username, password: form.password, email: form.email || undefined });
    store.setToken(res.accessToken);
    store.setUser(res.user);
    ElMessage.success(mode.value === 'login' ? '登录成功' : '注册成功');
    router.push('/dashboard');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-wrap {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-card { width: 400px; max-width: 92vw; border-radius: 12px; }
.login-title { text-align: center; font-size: 22px; font-weight: 600; margin: 12px 0 20px; color: #333; }
.full-btn { width: 100%; }
</style>