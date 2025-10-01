<template>
  <div class="chart-wrap">
    <!-- Kennzahl-Pillen (radiogroup, bleibt wie gehabt) -->
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

    <!-- Serien-Pillen (AN/AUS) – synchron mit Tabelle über emit('toggle') -->
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
        class="echart"
        :option="option"
        :autoresize="true"
        @legendselectchanged="onLegendSelect"
    />
  </div>
</template>

<script setup lang="ts">

import { computed, ref, watch } from "vue";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  LegendComponent,
  AxisPointerComponent
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
  AxisPointerComponent
]);

const props = defineProps<{
  series: iChartSeries[];
  modelValue?: ChartMetric;
}>();
const emit = defineEmits<{
  (e: "update:modelValue", v: ChartMetric): void;
  (e: "toggle", payload: { id: string; visible: boolean }): void;
}>();

/* Kennzahl-Auswahl (als Pillen) */
const metrics: { key: ChartMetric; label: string }[] = [
  { key: "cumReward", label: "Σ Reward" },
  { key: "avgReward", label: "Ø Reward" },
  { key: "regret", label: "Regret" },
  { key: "bestRate", label: "Best-Quote" }
];
const localMetric = ref<ChartMetric>(props.modelValue ?? "cumReward");
watch(
    () => props.modelValue,
    (v) => {
      if (v) localMetric.value = v;
    }
);
watch(localMetric, (v) => emit("update:modelValue", v));


function toXY(s: iChartSeries, metric: ChartMetric): Array<[number, number]> {
  return s.points[metric].map((p) => [p.step, p.y]);
}
const legendSelected = computed<Record<string, boolean>>(() => {
  const map: Record<string, boolean> = {};
  for (const s of props.series) map[s.config.id] = !!s.config.visible;
  return map;
});

const labelById = computed<Record<string, string>>(
    () => Object.fromEntries(props.series.map(s => [s.config.id, s.config.label]))
);

const option = computed(() => {
  const maxStep = Math.max(1, ...props.series.map(s => s.points.cumReward.length));

  return {
    legend: { show: false, selected: Object.fromEntries(props.series.map(s => [s.config.id, !!s.config.visible])) },
    grid: { left: 54, right: 16, top: 8, bottom: 28 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "line" },
      borderColor: "#333",
      backgroundColor: "#0f0f0f",
      textStyle: { color: "#e9e9e9" },
      confine: true,
      formatter: (params: any[]) => {
        const step = params?.[0]?.value?.[0];
        const rows = params.map(p => {
          const label = labelById.value[p.seriesName] ?? p.seriesName;
          return `
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="width:10px;height:10px;border-radius:999px;background:${p.color};display:inline-block"></span>
              <span style="flex:1;color:#cfd3d8">${label}</span>
              <b>${fmt(p.value?.[1])}</b>
            </div>`;
        }).join("");
        return `<div style="font-weight:700;margin-bottom:6px">Schritt ${step}</div>${rows}`;
      }
    },
    xAxis: { type: "value", min: 1, max: maxStep, boundaryGap: false,
      axisLine: { lineStyle: { color: "#333" } },
      axisLabel: { color: "#9aa0a6" },
      splitLine: { show: true, lineStyle: { color: "#202020" } } },
    yAxis: { type: "value",
      axisLine: { lineStyle: { color: "#333" } },
      axisLabel: { color: "#9aa0a6" },
      splitLine: { show: true, lineStyle: { color: "#202020" } } },
    dataZoom: [{ type: "inside", throttle: 30 }, { type: "slider", height: 16 }],


    series: props.series.map(s => ({
      name: s.config.id,                   // weiter ID = Schlüssel für Selection
      type: "line",
      smooth: true,
      showSymbol: false,
      symbol: "circle",
      symbolSize: 4,
      itemStyle: { color: s.config.color },            // Tooltip-/Marker-Farbe
      emphasis: { itemStyle: { color: s.config.color } },
      lineStyle: { width: 2.25, color: s.config.color },
      areaStyle: {
        opacity: 0.18,
        color: {
          type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: s.config.color }, { offset: 1, color: "rgba(0,0,0,0)" }]
        }
      },
      data: s.points[localMetric.value].map(p => [p.step, p.y])
    }))
  };
});

/* Sync zurück zum Parent (damit Tabelle & Chart gleich bleiben) */
function onToggleSeries(s: iChartSeries) {
  emit("toggle", { id: s.config.id, visible: !s.config.visible });
}

/* Falls du später die eingebaute (unsichtbare) Legend klicken willst,
   hier der Event-Handler. Aktuell nutzen wir unsere Pillen oben. */
function onLegendSelect(e: any) {
  // e.name = seriesName, e.selected[name] = boolean
  const id = e.name as string;
  const visible = !!e.selected?.[id];
  emit("toggle", { id, visible });
}

/* Kompakter Formatter */
function fmt(n: number) {
  if (!Number.isFinite(n)) return "0";
  return Math.abs(n) >= 100
      ? Math.round(n).toString()
      : (Math.round(n * 10) / 10).toString();
}
</script>

<script lang="ts">
/* Kleiner Trick: lokale Registrierung für <v-chart> */
export default {
  components: { VChart }
};
</script>

<style scoped>
.chart-wrap{ display:grid; gap:10px; }

/* Toolbars */
.chart-toolbar{ display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
.metric-pills{ display:flex; gap:8px; flex-wrap:wrap; }
.series-toolbar{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:4px; }

/* Pillen */
.pill{
  height:32px; padding:0 12px;
  display:inline-flex; align-items:center; gap:8px;
  border:1px solid var(--line); border-radius:999px;
  background:#151515; color:#d8d8d8;
  cursor:pointer; user-select:none;
  transition: transform var(--dur-quick) var(--ease-quick), box-shadow var(--dur-quick) var(--ease-quick), background var(--dur-quick) var(--ease-quick), border-color var(--dur-quick) var(--ease-quick), color var(--dur-quick) var(--ease-quick);
}
.pill:hover{ transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,0,0,.25); }
.pill.metric.active{ background:#ff0000; border-color:#ff0000; color:#fff; }
.pill.series.off{ opacity:.55; filter: grayscale(.08); }
.pill.series .dot{ width:10px; height:10px; border-radius:999px; display:inline-block; }

/* Chart-Container */
.echart{
  width:100%;
  height: 320px; /* gerne anpassen */
  background:#111; border:1px solid var(--line); border-radius:10px;
  --line: #2a2a2a;
}
</style>