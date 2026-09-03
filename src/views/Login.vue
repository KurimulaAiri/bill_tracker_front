<template>
  <div class="login-wrap">
    <canvas ref="canvasRef" class="bg-canvas"></canvas>
    <div class="bg-overlay"></div>
    <el-card class="login-card">
      <div class="login-title">个人账单统计</div>
      <el-form :model="form" label-width="0" @keyup.enter="submit">
        <el-form-item>
          <el-input v-model="form.username" placeholder="用户名" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password />
        </el-form-item>
        <el-button type="primary" size="large" class="full-btn" :loading="loading" @click="submit">登 录</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { login } from '../api/auth';
import { useUserStore } from '../stores/user';

const router = useRouter();
const store = useUserStore();
const loading = ref(false);
const form = reactive({ username: '', password: '' });
const canvasRef = ref<HTMLCanvasElement>();

let rafId = 0;
let resizeTimer: ReturnType<typeof setTimeout> | undefined;

async function submit() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码');
    return;
  }
  loading.value = true;
  try {
    const res: any = await login({ username: form.username, password: form.password });
    store.setToken(res.accessToken);
    store.setUser(res.user);
    ElMessage.success('登录成功');
    router.push('/dashboard');
  } finally {
    loading.value = false;
  }
}

// ---------- 点阵动效：鼠标附近的点缓慢靠近，离开后逐渐回到原位 ----------
function initParticles(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => undefined;

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0;
  let h = 0;
  let dots: { x: number; y: number; ox: number; oy: number; r: number }[] = [];

  // 目标点：鼠标在世界坐标中的位置（null 表示鼠标离开）
  let mouse: { x: number; y: number } | null = null;
  // 每帧向目标位置逼近的比例（越小越缓慢）
  const SPEED = 0.035;

  function resize() {
    w = canvas.clientWidth || window.innerWidth;
    h = canvas.clientHeight || window.innerHeight;
    canvas.width = w * DPR;
    canvas.height = h * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    generate();
  }

  function generate() {
    if (!w || !h) return;
    const gap = 34;
    dots = [];
    for (let y = gap / 2; y < h; y += gap) {
      for (let x = gap / 2; x < w; x += gap) {
        dots.push({ x, y, ox: x, oy: y, r: 1.7 });
      }
    }
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const d of dots) {
      let tx = d.ox;
      let ty = d.oy;
      if (mouse) {
        const dx = d.ox - mouse.x;
        const dy = d.oy - mouse.y;
        const dist2 = dx * dx + dy * dy;
        const R = 170;
        const r2 = R * R;
        if (dist2 < r2) {
          const pull = (1 - dist2 / r2) * 0.55;
          tx = d.ox - dx * pull;
          ty = d.oy - dy * pull;
        }
      }
      d.x += (tx - d.x) * SPEED;
      d.y += (ty - d.y) * SPEED;

      const a = mouse ? 0.7 : 0.45;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(38, 124, 110, ${a})`;
      ctx.fill();
    }
    rafId = requestAnimationFrame(tick);
  }

  function onMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function onMouseLeave() {
    mouse = null;
  }
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  }

  resize();
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);
  window.addEventListener('resize', onResize);
  rafId = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(rafId);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mouseleave', onMouseLeave);
    window.removeEventListener('resize', onResize);
    clearTimeout(resizeTimer);
  };
}

let cleanup: (() => void) | undefined;
onMounted(() => {
  if (canvasRef.value) cleanup = initParticles(canvasRef.value);
});
onBeforeUnmount(() => {
  cleanup?.();
});
</script>

<style scoped>
.login-wrap {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(150deg, #92dcd3 0%, #7fd4cb 45%, #e8f7f4 100%);
}
.bg-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}
/* 轻微半透明白色层，让点阵融进背景、卡片更突出 */
.bg-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0) 30%, rgba(255, 255, 255, 0.28) 100%);
  pointer-events: none;
}
.login-card {
  position: relative;
  z-index: 3;
  width: 400px;
  max-width: 92vw;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(46, 120, 108, 0.18);
}
.login-title {
  text-align: center;
  font-size: 22px;
  font-weight: 600;
  margin: 12px 0 20px;
  color: #2d7d70;
}
.full-btn {
  width: 100%;
}
</style>