<template>
  <div class="dashboard">
    <el-row :gutter="16">
      <el-col :xs="12" :sm="6">
        <el-card class="metric-card">
          <div class="metric-label">本月收入</div>
          <div class="metric-value income">¥{{ centsToYuan(summary.income) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="metric-card">
          <div class="metric-label">本月支出</div>
          <div class="metric-value expense">¥{{ centsToYuan(summary.expense) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="metric-card">
          <div class="metric-label">本月结余</div>
          <div class="metric-value">{{ centsToYuan(summary.balance) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="metric-card">
          <div class="metric-label">中性交易</div>
          <div class="metric-value neutral">¥{{ centsToYuan(summary.neutral) }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mid-row">
      <el-col :xs="24" :md="12">
        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>近12个月收支趋势</span>
              <el-button link type="primary" @click="$router.push('/stats')">查看全部统计 →</el-button>
            </div>
          </template>
          <div ref="trendRef" class="chart"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card class="chart-card">
          <template #header><span>本月支出分类占比</span></template>
          <div ref="catRef" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="guide-card" v-if="!hasBills">
      <el-empty description="暂无账单数据">
        <el-button type="primary" @click="$router.push('/import')">去导入账单文件</el-button>
      </el-empty>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import * as echarts from 'echarts';
import { fetchSummary, fetchTrend, fetchCategoryStats } from '../api/stats';

const summary = ref<any>({ income: '0', expense: '0', balance: '0', neutral: '0' });
const hasBills = computed(() => Number(summary.value.income) + Number(summary.value.expense) !== 0 || Number(summary.value.neutral) !== 0);
const trendRef = ref<HTMLElement>();
const catRef = ref<HTMLElement>();
let trendChart: echarts.ECharts | null = null;
let catChart: echarts.ECharts | null = null;

function centsToYuan(c: string | number): number {
  return Math.round(Number(c)) / 100;
}

async function load() {
  const m = new Date();
  const month = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
  summary.value = (await fetchSummary({ month })) as any;

  const trend: any = await fetchTrend({ months: 12 });
  trendChart?.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '支出'] },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: trend.map((r: any) => r.month) },
    yAxis: { type: 'value', name: '元' },
    series: [
      { name: '收入', type: 'line', smooth: true, data: trend.map((r: any) => centsToYuan(r.income)), itemStyle: { color: '#67c23a' } },
      { name: '支出', type: 'line', smooth: true, data: trend.map((r: any) => centsToYuan(r.expense)), itemStyle: { color: '#e6a23c' } },
    ],
  });

  const cat: any = await fetchCategoryStats({ month, type: 'expense' });
  catChart?.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}元 ({d}%)' },
    series: [{ type: 'pie', radius: ['35%', '65%'], data: cat.items.map((i: any) => ({ name: i.name, value: centsToYuan(i.amount) })) }],
  });
}

function resize() { trendChart?.resize(); catChart?.resize(); }

onMounted(() => {
  if (trendRef.value) trendChart = echarts.init(trendRef.value);
  if (catRef.value) catChart = echarts.init(catRef.value);
  load();
  window.addEventListener('resize', resize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize);
  trendChart?.dispose();
  catChart?.dispose();
});
</script>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: 16px; }
.metric-card { border-radius: 12px; text-align: center; }
.metric-label { color: #909399; font-size: 13px; }
.metric-value { font-size: 22px; font-weight: 700; margin-top: 6px; font-family: 'Segoe UI', Roboto, sans-serif; }
.income { color: #67c23a; }
.expense { color: #e6a23c; }
.neutral { color: #909399; }
.mid-row { margin-top: 0; }
.chart-card { border-radius: 12px; }
.chart { height: 300px; width: 100%; }
.chart-header { display: flex; justify-content: space-between; align-items: center; }
</style>