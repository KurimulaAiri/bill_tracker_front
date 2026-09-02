<template>
  <div class="stats-page">
    <el-card class="chart-card">
      <template #header>
        <div class="chart-header">
          <span>收支趋势（近{{ months }}个月）</span>
          <el-select v-model="months" size="small" style="width: 100px" @change="loadTrend">
            <el-option :value="6" label="6个月" />
            <el-option :value="12" label="12个月" />
          </el-select>
        </div>
      </template>
      <div ref="trendRef" class="chart"></div>
    </el-card>

    <el-row :gutter="16">
      <el-col :xs="24" :md="12">
        <el-card class="chart-card">
          <template #header><span>支出分类占比（{{ month }}）</span></template>
          <div ref="catRef" class="chart"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card class="chart-card">
          <template #header><span>收入分类占比（{{ month }}）</span></template>
          <div ref="incRef" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';
import { fetchTrend, fetchCategoryStats } from '../api/stats';

const trendRef = ref<HTMLElement>();
const catRef = ref<HTMLElement>();
const incRef = ref<HTMLElement>();
const months = ref(12);
const month = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
})();

let trendChart: echarts.ECharts | null = null;
let catChart: echarts.ECharts | null = null;
let incChart: echarts.ECharts | null = null;

async function loadTrend() {
  const res: any = await fetchTrend({ months: months.value });
  if (!trendChart) return;
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '支出'] },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: res.map((r: any) => r.month) },
    yAxis: { type: 'value', name: '元' },
    series: [
      { name: '收入', type: 'line', smooth: true, data: res.map((r: any) => centsToYuan(r.income)), itemStyle: { color: '#67c23a' } },
      { name: '支出', type: 'line', smooth: true, data: res.map((r: any) => centsToYuan(r.expense)), itemStyle: { color: '#e6a23c' } },
    ],
  });
}

async function loadCategories(monthStr = month) {
  const cat: any = await fetchCategoryStats({ month: monthStr, type: 'expense' });
  const inc: any = await fetchCategoryStats({ month: monthStr, type: 'income' });
  if (catChart) {
    catChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c}元 ({d}%)' },
      series: [{ type: 'pie', radius: ['35%', '65%'], data: cat.items.map((i: any) => ({ name: i.name, value: centsToYuan(i.amount) })) }],
    });
  }
  if (incChart) {
    incChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c}元 ({d}%)' },
      series: [{ type: 'pie', radius: ['35%', '65%'], data: inc.items.map((i: any) => ({ name: i.name, value: centsToYuan(i.amount) })) }],
    });
  }
}

function centsToYuan(c: string | number): number {
  return Math.round(Number(c)) / 100;
}

function initCharts() {
  if (trendRef.value) trendChart = echarts.init(trendRef.value);
  if (catRef.value) catChart = echarts.init(catRef.value);
  if (incRef.value) incChart = echarts.init(incRef.value);
}

function resize() {
  trendChart?.resize();
  catChart?.resize();
  incChart?.resize();
}

onMounted(() => {
  initCharts();
  loadTrend();
  loadCategories();
  window.addEventListener('resize', resize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize);
  trendChart?.dispose();
  catChart?.dispose();
  incChart?.dispose();
});
</script>

<style scoped>
.stats-page { display: flex; flex-direction: column; gap: 16px; }
.chart-card { border-radius: 12px; }
.chart { height: 320px; width: 100%; }
.chart-header { display: flex; justify-content: space-between; align-items: center; }
</style>