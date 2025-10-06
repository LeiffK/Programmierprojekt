<template>
  <div class="chart-wrap">
    <!-- Kennzahl-Pillen -->
    <div class="chart-toolbar">
      <span class="label">Kennzahl</span>
      <div class="metric-pills" role="radiogroup" aria-label="Kennzahl wählen">
        <button
            v-for="m in metrics"
            :key="m.key"
            class="pill metric"
            :class="{ active: localMetric === m.key }"
            role="radio"
            :aria-checked="localMetric === m.key"
            type="button"
            @click="localMetric = m.key"
        >
          {{ m.label }}
        </button>
      </div>
    </div>

    <!-- Serien-Pillen -->
    <div class="series-toolbar" aria-label="Serien wählen">
      <button
          v-for="s in series"
          :key="s.config.id"
          type="button"
          class="pill series"
          :class="{ off: !s.config.visible }"
          :aria-pressed="s.config.visible"
          :title="s.config.visible ? `${s.config.label} ausblenden` : `${s.config.label} einblenden`"
          @click="onToggleSeries(s)"
      >
        <span class="dot" :style="{ background: s.config.color }" />
        <span class="name">{{ s.config.label }}</span>
      </button>
    </div>

    <v-chart
        ref="chartRef"
        class="echart"
        :option="option"
        :update-options="updateOpts"
        :autoresize="true"
        @legendselectchanged="onLegendSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { use } from "echarts/core";
import type { EChartsOption } from "echarts";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  LegendComponent,
  AxisPointerComponent,
} from "echarts/components";
import VChart from "vue-echarts";
import type { ChartMetric } from "../domain/chart/iChartMetric";
import type { iChartSeries } from "../domain/chart/iChartSeries";

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  LegendComponent,
  AxisPointerComponent,
]);

const chartRef = ref<InstanceType<typeof VChart> | null>(null);

const props = defineProps<{ series: iChartSeries[]; modelValue?: ChartMetric }>();
const emit = defineEmits<{
  (e: "update:modelValue", v: ChartMetric): void;
  (e: "toggle", payload: { id: string; visible: boolean }): void;
}>();

/* Kennzahl-Auswahl */
const metrics: { key: ChartMetric; label: string }[] = [
  { key: "cumReward", label: "Σ Reward" },
  { key: "avgReward", label: "Ø Reward" },
  { key: "regret", label: "Regret" },
  { key: "bestRate", label: "Best-Quote" },
];
const localMetric = ref<ChartMetric>(props.modelValue ?? "cumReward");
watch(() => props.modelValue, (v) => { if (v) localMetric.value = v; });
watch(localMetric, (v) => emit("update:modelValue", v));

/* Smoother Updates */
const updateOpts = { notMerge: false, lazyUpdate: true } as const;

const legendSelected = computed<Record<string, boolean>>(() =>
    Object.fromEntries(props.series.map((s) => [s.config.id, !!s.config.visible])),
);
const labelById = computed<Record<string, string>>(
    () => Object.fromEntries(props.series.map((s) => [s.config.id, s.config.label])),
);

/* Tween-Dauern für weiche Übergänge bei niedrigen Raten */
const TWEEN_MS = 850;
const INIT_MS  = 300;

const option = computed<EChartsOption>(() => {
  const maxStep = Math.max(1, ...props.series.map((s) => s.points.cumReward.length));

  // Achsen als 'any' typisiert, um TS-Inkompatibilitäten zwischen ECharts-Versionen zu vermeiden
  const xAxis: any = {
    type: "value",
    min: 1,
    max: maxStep,
    boundaryGap: [0, 0] as [number, number],
    axisLine: { lineStyle: { color: "#333" } },
    axisLabel: { color: "#9aa0a6" },
    splitLine: { show: true, lineStyle: { color: "#202020" } },
  };
  const yAxis: any = {
    type: "value",
    axisLine: { lineStyle: { color: "#333" } },
    axisLabel: { color: "#9aa0a6" },
    splitLine: { show: true, lineStyle: { color: "#202020" } },
  };

  // Tooltip ebenfalls locker typisiert (Formatter-Signaturen variieren je nach Version)
  const tooltip: any = {
    trigger: "axis",
    axisPointer: { type: "line", animation: true },
    borderColor: "#333",
    backgroundColor: "#0f0f0f",
    textStyle: { color: "#e9e9e9" },
    confine: true,
    formatter: (params: any[]) => {
      const step = params?.[0]?.value?.[0];
      const rows = params
          .map((p) => {
            const label = labelById.value[p.seriesName] ?? p.seriesName;
            return `
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="width:10px;height:10px;border-radius:999px;background:${p.color};display:inline-block"></span>
              <span style="flex:1;color:#cfd3d8">${label}</span>
              <b>${fmt(p.value?.[1])}</b>
            </div>`;
          })
          .join("");
      return `<div style="font-weight:700;margin-bottom:6px">Schritt ${step}</div>${rows}`;
    },
  };

  const opt: EChartsOption = {
    animation: true,
    animationDuration: INIT_MS,
    animationEasing: "linear",
    animationDurationUpdate: TWEEN_MS,
    animationEasingUpdate: "linear",

    legend: { show: false, selected: legendSelected.value },
    grid: { left: 54, right: 16, top: 8, bottom: 28 },
    tooltip,
    xAxis,
    yAxis,

    dataZoom: [
      { type: "inside", throttle: 30 },
      { type: "slider", height: 16 },
    ],
    progressive: 2000,
    progressiveThreshold: 3000,

    series: props.series.map((s) => ({
      name: s.config.id,
      type: "line",
      smooth: 0.25,
      smoothMonotone: "x",
      showSymbol: false,
      symbol: "circle",
      symbolSize: 4,
      universalTransition: true,
      animationDuration: INIT_MS,
      animationDurationUpdate: TWEEN_MS,
      animationEasing: "linear",
      animationEasingUpdate: "linear",
      lineStyle: { width: 2.25, color: s.config.color },
      itemStyle: { color: s.config.color },
      emphasis: { itemStyle: { color: s.config.color } },
      areaStyle: {
        opacity: 0.16,
        color: {
          type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: s.config.color },
            { offset: 1, color: "rgba(0,0,0,0)" },
          ],
        },
      },
      data: s.points[localMetric.value].map((p) => [p.step, p.y]),
    })),
  };

  return opt;
});

function onToggleSeries(s: iChartSeries) {
  emit("toggle", { id: s.config.id, visible: !s.config.visible });
}
function onLegendSelect(e: any) {
  const id = e.name as string;
  const visible = !!e.selected?.[id];
  emit("toggle", { id, visible });
}

/* Helper */
function fmt(n: number) {
  if (!Number.isFinite(n)) return "0";
  return Math.abs(n) >= 100 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString();
}
</script>

<style scoped>
.chart-wrap { display: grid; gap: 10px; }

/* Toolbars */
.chart-toolbar { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.metric-pills { display: flex; gap: 8px; flex-wrap: wrap; }
.series-toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 4px; }

/* Pillen */
.pill {
  height: 32px; padding: 0 12px; display: inline-flex; align-items: center; gap: 8px;
  border: 1px solid var(--line); border-radius: 999px; background: #151515; color: #d8d8d8;
  cursor: pointer; user-select: none;
  transition: transform var(--dur-quick) var(--ease-quick), box-shadow var(--dur-quick) var(--ease-quick),
  background var(--dur-quick) var(--ease-quick), border-color var(--dur-quick) var(--ease-quick),
  color var(--dur-quick) var(--ease-quick);
}
.pill:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,0,0,0.25); }
.pill.metric.active { background: #ff0000; border-color: #ff0000; color: #fff; }
.pill.series.off { opacity: 0.55; filter: grayscale(0.08); }
.pill.series .dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }

/* Chart-Container */
.echart {
  width: 100%;
  height: 320px;
  background: #111;
  border: 1px solid var(--line);
  border-radius: 10px;
  --line: #2a2a2a;
}
</style>