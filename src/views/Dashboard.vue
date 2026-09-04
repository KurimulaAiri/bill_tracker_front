<template>
  <div class="dashboard">
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
          @change="load"
        />
        <span v-if="!range" class="range-hint">当前统计：{{ rangeText }}</span>
      </div>
    </el-card>

    <el-row :gutter="16">
      <el-col :xs="12" :sm="6">
        <el-card class="metric-card">
          <div class="metric-label">收入</div>
          <div class="metric-value income">¥{{ centsToYuan(summary.income) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="metric-card">
          <div class="metric-label">支出</div>
          <div class="metric-value expense">¥{{ centsToYuan(summary.expense) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="metric-card">
          <div class="metric-label">结余</div>
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

    <el-card class="net-card" :class="net >= 0 ? 'net-income' : 'net-expense'">
      <div class="net-block">
        <span class="net-label">{{ net >= 0 ? '净收入' : '净支出' }}</span>
        <span class="net-value">¥{{ centsToYuan(Math.abs(net)) }}</span>
      </div>
    </el-card>

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
          <template #header><span>支出分类占比（{{ rangeText }}）</span></template>
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
// 净收支：收入 - 支出，>0 净收入，<0 净支出
const net = computed(() => Number(summary.value.income) - Number(summary.value.expense));
function statParams(): any {
  if (range.value && range.value[0] && range.value[1]) return { start: range.value[0], end: range.value[1] };
  return { month: currentMonth() };
}

function centsToYuan(c: string | number): number {
  return Math.round(Number(c)) / 100;
}

async function load() {
  summary.value = (await fetchSummary(statParams())) as any;

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

  const cat: any = await fetchCategoryStats({ ...statParams(), type: 'expense' });
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
.range-card { border-radius: 12px; }
.range-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.range-label { color: #909399; font-size: 13px; }
.range-hint { color: #a8abb2; font-size: 12px; }
.net-card { border-radius: 12px; }
.net-card .el-card__body { padding: 12px 20px; }
.net-block { display: flex; align-items: baseline; gap: 8px; }
.net-label { font-size: 13px; color: #606266; }
.net-value { font-size: 24px; font-weight: 700; font-family: 'Segoe UI', Roboto, sans-serif; }
.net-income { border-left: 4px solid #67c23a; }
.net-income .net-value { color: #67c23a; }
.net-expense { border-left: 4px solid #e6a23c; }
.net-expense .net-value { color: #e6a23c; }
</style>