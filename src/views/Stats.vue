<template>
  <div class="stats-page">
    <el-card class="range-card">
      <div class="range-bar">
        <span class="range-label">统计范围</span>
        <el-date-picker
          v-model="range"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          :shortcuts="rangeShortcuts"
          clearable
          size="small"
          style="width: 240px"
          @change="loadAll"
        />
        <span v-if="!range" class="range-hint">当前统计：{{ rangeText }}</span>
      </div>
      <div class="net-stats">
        <div class="net-item">
          <span class="net-item-label">收入</span>
          <span class="net-item-value income">¥{{ centsToYuan(summary.income) }}</span>
        </div>
        <div class="net-item">
          <span class="net-item-label">支出</span>
          <span class="net-item-value expense">¥{{ centsToYuan(summary.expense) }}</span>
        </div>
        <div class="net-item" :class="net >= 0 ? 'income' : 'expense'">
          <span class="net-item-label">{{ net >= 0 ? '净收入' : '净支出' }}</span>
          <span class="net-item-value">¥{{ centsToYuan(Math.abs(net)) }}</span>
        </div>
      </div>
    </el-card>

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
          <template #header><span>支出分类占比（{{ rangeText }}）</span></template>
          <div ref="catRef" class="chart"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card class="chart-card">
          <template #header><span>收入分类占比（{{ rangeText }}）</span></template>
          <div ref="incRef" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';
import { fetchSummary, fetchTrend, fetchCategoryStats } from '../api/stats';

const trendRef = ref<HTMLElement>();
const catRef = ref<HTMLElement>();
const incRef = ref<HTMLElement>();
const months = ref(12);

let trendChart: echarts.ECharts | null = null;
let catChart: echarts.ECharts | null = null;
let incChart: echarts.ECharts | null = null;

// 统计范围：默认本月，可选日期区间
const range = ref<[string, string] | null>(null);
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
const rangeShortcuts = [
  { text: '本月', value: () => { const d = new Date(); return [toDateStr(new Date(d.getFullYear(), d.getMonth(), 1)), toDateStr(d)]; } },
  { text: '上月', value: () => { const d = new Date(); return [toDateStr(new Date(d.getFullYear(), d.getMonth() - 1, 1)), toDateStr(new Date(d.getFullYear(), d.getMonth(), 0))]; } },
  { text: '近30天', value: () => { const d = new Date(); const s = new Date(d); s.setDate(s.getDate() - 29); return [toDateStr(s), toDateStr(d)]; } },
  { text: '本年', value: () => [toDateStr(new Date(new Date().getFullYear(), 0, 1)), toDateStr(new Date())] },
];
const rangeText = computed(() => {
  if (range.value && range.value[0] && range.value[1]) return `${range.value[0]} ~ ${range.value[1]}`;
  return `本月(${currentMonth()})`;
});
const summary = ref<any>({ income: '0', expense: '0' });
// 净收支：收入 - 支出，>0 净收入，<0 净支出
const net = computed(() => Number(summary.value.income) - Number(summary.value.expense));
function statParams(): any {
  if (range.value && range.value[0] && range.value[1]) return { start: range.value[0], end: range.value[1] };
  return { month: currentMonth() };
}

async function loadSummary() {
  summary.value = (await fetchSummary(statParams())) as any;
}

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

async function loadCategories() {
  const p = statParams();
  const cat: any = await fetchCategoryStats({ ...p, type: 'expense' });
  const inc: any = await fetchCategoryStats({ ...p, type: 'income' });
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

async function loadAll() {
  await loadSummary();
  await Promise.all([loadTrend(), loadCategories()]);
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
  loadAll();
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
.range-card { border-radius: 12px; }
.range-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.range-label { color: #909399; font-size: 13px; }
.range-hint { color: #a8abb2; font-size: 12px; }
.net-stats { display: flex; gap: 32px; margin-top: 12px; flex-wrap: wrap; }
.net-item { display: flex; align-items: baseline; gap: 8px; }
.net-item-label { color: #909399; font-size: 13px; }
.net-item-value { font-size: 20px; font-weight: 700; font-family: 'Segoe UI', Roboto, sans-serif; }
.income { color: #67c23a; }
.expense { color: #e6a23c; }
</style>