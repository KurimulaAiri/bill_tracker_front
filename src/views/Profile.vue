<template>
  <div class="profile-page">
    <el-card class="profile-card">
      <template #header><span>个人中心</span></template>

      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="用户名">{{ info?.username || '-' }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ info?.email || '未设置' }}</el-descriptions-item>
        <el-descriptions-item label="注册时间">{{ info?.createdAt ? formatTime(info.createdAt) : '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card class="profile-card">
      <template #header><span>修改密码</span></template>
      <el-form :model="form" label-width="90px" style="max-width: 380px">
        <el-form-item label="原密码">
          <el-input v-model="form.oldPassword" type="password" show-password placeholder="输入原密码" />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="form.newPassword" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>
        <el-form-item label="确认新密码">
          <el-input v-model="form.confirm" type="password" show-password placeholder="再次输入新密码" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="submit">保存修改</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="profile-card">
      <el-button type="danger" plain @click="logout">退出登录</el-button>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { fetchMe, changePassword } from '../api/auth';
import { useUserStore } from '../stores/user';
import { formatTime } from '../utils/format';

const router = useRouter();
const store = useUserStore();
const info = ref<any>(null);
const saving = ref(false);
const form = reactive({ oldPassword: '', newPassword: '', confirm: '' });

async function load() {
  try {
    info.value = (await fetchMe()) as any;
  } catch {
    info.value = null;
  }
}

async function submit() {
  if (!form.oldPassword) { ElMessage.warning('请输入原密码'); return; }
  if (!form.newPassword || form.newPassword.length < 6) { ElMessage.warning('新密码至少 6 位'); return; }
  if (form.newPassword !== form.confirm) { ElMessage.warning('两次输入的新密码不一致'); return; }
  saving.value = true;
  try {
    const res: any = await changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword });
    // 后端返回新 token，更新本地登录态
    if (res?.accessToken) {
      store.setToken(res.accessToken);
      store.setUser(res.user);
    }
    ElMessage.success('密码已修改');
    form.oldPassword = '';
    form.newPassword = '';
    form.confirm = '';
  } finally {
    saving.value = false;
  }
}

function logout() {
  store.logout();
  router.push('/login');
}

onMounted(load);
</script>

<style scoped>
.profile-page { max-width: 640px; }
.profile-card { border-radius: 12px; margin-bottom: 14px; }
</style>