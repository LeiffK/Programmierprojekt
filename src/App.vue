<template>
  <div class="shell">
    <header class="bar"><div class="bar-inner"><div class="brand">Bandit Lab</div></div></header>
    <main class="wrap">
      <div class="page-grid">
        <div class="col-left">
          <EnvSetup v-model="form" :busy="busy" @inited="onInited" @log="onEnvLog">
            <template #actions>
              <ModeSwitch v-model="mode" @change="onModeChange" />
            </template>
          </EnvSetup>

          <AdvancedSettings
              :mode="mode"
              v-model:env="form"
              v-model:policyConfigs="policyConfigs"
              v-model:open="settingsOpen"
          />

          <section class="card" v-if="mode === 'manual'">
            <h2>Manuell testen</h2>
            <p class="muted">Jeder Klick triggert zusätzlich alle Algorithmen für einen Schritt.</p>
            <div class="thumb-grid">
              <ThumbnailCard
                  v-for="i in form.arms"
                  :key="i"
                  :label="`Thumbnail ${String.fromCharCode(64 + i)}`"
                  :variant="`Variante ${String.fromCharCode(64 + i)}`"
                  :n="snapshot?.counts[i - 1] || 0"
                  :estimate="estimateText(i - 1)"
                  :truth="truthText(i - 1)"
                  @pick="onManual(i - 1)"
              />
            </div>
            <div class="toast"><div class="pill">Letztes Ereignis</div><div>{{ lastEventText }}</div></div>
          </section>

          <RunnerControls
              v-else
              :envId="envId || null"
              :arms="snapshot?.config?.arms || form.arms"
              :policy-configs="policyConfigs"
              @reset="onRunnerReset"
          />
        </div>

        <div class="col-right">
          <section class="card">
            <h2>Verläufe</h2>
            <ChartArea :series="chartSeries" v-model="chartMetric" @toggle="onChartToggle" />
          </section>

          <DebugPanel />

          <ComparisonTable
              class="card"
              :rows="metricRows"
              v-model:open="tableOpen"
              @toggleSeries="onToggleSeries"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount, watch } from "vue";
import EnvSetup from "./components/EnvSetup.vue";
import AdvancedSettings from "./components/AdvancedSettings.vue";
import DebugPanel from "./components/DebugPanel.vue";
import ThumbnailCard from "./components/ThumbnailCard.vue";
import RunnerControls from "./components/RunnerControls.vue";
import ModeSwitch from "./components/ModeSwitch.vue";
import ChartArea from "./components/ChartArea.vue";
import ComparisonTable from "./components/ComparisonTable.vue";

import type { ManualStep } from "./domain/iHistory";
import type { iMetricsRow } from "./domain/iMetrics";
import type { iChartSeries } from "./domain/chart/iChartSeries";
import type { ChartMetric } from "./domain/chart/iChartMetric";
import type { iEnvConfig } from "./env/Domain/iEnvConfig";
import { pullAction, getEnvSnapshot } from "./api/banditClient";
import { getSeriesState, setSeriesVisible, resetSeriesStore, ensureSeries } from "./services/seriesStore";
import { buildMetricsRowFromManual, buildSeriesFromManual } from "./services/metrics";
import { algorithmsRunner } from "./services/algorithmsRunner";
import { attachRunner } from "./services/debugStore";

/* State */
const form = ref<iEnvConfig>({ type: "gaussian", arms: 6, seed: 12345 });
const envId = ref("");
const busy = ref(false);

/* Policies inkl. Varianten und optionaler Custom-Policy */
const policyConfigs = ref<any>({
  greedy: { optimisticInitialValue: 100 },
  epsgreedy: { epsilon: 0.1, optimisticInitialValue: 150, variants: [{ epsilon: 0.1, optimisticInitialValue: 150 }] },
});

/* UI-Flags */
const snapshot = ref<{ config: iEnvConfig; optimalAction: number; counts: number[]; estimates: number[] } | null>(null);
const lastEventText = ref("—");
const mode = ref<"manual" | "algo">("manual");
const tableOpen = ref(false);
const settingsOpen = ref(false);
const chartMetric = ref<ChartMetric>("cumReward");

/* Historien */
const manualHistory = ref<ManualStep[]>([]);
const seriesState = getSeriesState();
const algoHistory = ref<Record<string, ManualStep[]>>({});

/* Palette für dynamische Serien */
const palette = ["#f39c12","#e91e63","#9c27b0","#00bcd4","#8bc34a","#ffc107","#ff5722","#03a9f4","#cddc39","#795548"];
let paletteIdx = 0;
function nextColor() { const c = palette[paletteIdx % palette.length]; paletteIdx++; return c; }

/* aktive Algoserien */
type ActiveSeries = { id: string; label: string; color: string };
const activeAlgoSeries = ref<ActiveSeries[]>([]);

/* rAF-Drosselung */
const algoRev = ref(0);
let rafPending = false;
function scheduleRender() { if (rafPending) return; rafPending = true; requestAnimationFrame(() => { rafPending = false; algoRev.value++; }); }

/* Basisserie "Manuell" registrieren */
ensureSeries("manual", "Manuell", "#4caf50");

/* Runner-Events */
const offRunner = algorithmsRunner.on((msg: any) => {
  if (msg.type === "RESULT") {
    const id = msg.payload.policyId as string;
    if (!(seriesState as any)[id]) {
      const color = nextColor();
      const label = prettyLabelFromId(id);
      ensureSeries(id, label, color);
      if (!algoHistory.value[id]) algoHistory.value[id] = [];
      activeAlgoSeries.value.push({ id, label, color });
    }
    (algoHistory.value[id] ??= []).push({
      action: msg.payload.action,
      reward: msg.payload.reward,
      isOptimal: msg.payload.isOptimal,
    });
    scheduleRender();
  }
});

/* Serienaufbau aus policyConfigs */
function prepareSeriesFromPolicies() {
  activeAlgoSeries.value = [];

  // Greedy
  const greedyColor = "#4fc3f7";
  ensureSeries("greedy", "Greedy", greedyColor);
  activeAlgoSeries.value.push({ id: "greedy", label: "Greedy", color: greedyColor });
  if (!algoHistory.value["greedy"]) algoHistory.value["greedy"] = [];

  // ε-Greedy Varianten
  const eg: any = (policyConfigs as any).value?.epsgreedy ?? {};
  const list = Array.isArray(eg.variants) && eg.variants.length
      ? eg.variants
      : [{ epsilon: eg.epsilon ?? 0.1, optimisticInitialValue: eg.optimisticInitialValue ?? 150 }];
  list.forEach((v: any, idx: number) => {
    const id = `epsgreedy#${idx + 1}`;
    const label = `ε-Greedy v${idx + 1} (ε=${Number(v.epsilon ?? 0.1).toFixed(2)})`;
    const color = nextColor();
    ensureSeries(id, label, color);
    activeAlgoSeries.value.push({ id, label, color });
    if (!algoHistory.value[id]) algoHistory.value[id] = [];
  });

  // Custom (optional)
  const custom = (policyConfigs as any).value?.customPolicy;
  if (custom) {
    const id = "custom";
    const label = custom?.constructor?.name ? `Custom (${custom.constructor.name})` : "Custom";
    const color = nextColor();
    ensureSeries(id, label, color);
    activeAlgoSeries.value.push({ id, label, color });
    if (!algoHistory.value[id]) algoHistory.value[id] = [];
  }
}

function prettyLabelFromId(id: string) {
  if (id === "greedy") return "Greedy";
  if (id === "custom") return "Custom";
  const m = id.match(/^epsgreedy#(\d+)$/);
  if (m) return `ε-Greedy v${m[1]}`;
  return id;
}

/* Runner (Re)Konfiguration */
function configureAlgoRunnerForCurrentEnv() {
  if (!envId.value) return;
  const snap = getEnvSnapshot(envId.value);
  if (!snap?.config) return;

  prepareSeriesFromPolicies();

  algorithmsRunner.configure({
    envId: envId.value,
    envConfig: snap.config,
    totalSteps: 0,
    rate: 1,
    policyConfigs: (policyConfigs as any).value,
  });
}

/* Reset vom RunnerControls */
function onRunnerReset() {
  // Stores + Serien + Historien hart zurücksetzen
  resetSeriesStore();
  ensureSeries("manual", "Manuell", "#4caf50");
  manualHistory.value = [];
  algoHistory.value = {};
  paletteIdx = 0;

  // Serien entsprechend aktueller Policies wieder anlegen
  prepareSeriesFromPolicies();
  scheduleRender();

  // Runner neu vorbereiten (ohne Start)
  configureAlgoRunnerForCurrentEnv();
}

watch(policyConfigs, () => { configureAlgoRunnerForCurrentEnv(); });

/* Mode + Init */
function onModeChange() {
  lastEventText.value = `Modus: ${mode.value === "manual" ? "Manuell" : "Algorithmisch"}`;
}
async function onInited(payload: { envId: string; optimalAction: number }) {
  envId.value = payload.envId;
  const snap = getEnvSnapshot(envId.value);
  snapshot.value = snap ?? null;
  lastEventText.value = `Init – optimaler Arm: ${payload.optimalAction}`;

  onRunnerReset(); // einheitlicher Reset-Pfad
}

/* Manuelle Aktion */
async function onManual(a: number) {
  if (!envId.value) return;
  if (algorithmsRunner.getStatus() === "IDLE") configureAlgoRunnerForCurrentEnv();

  busy.value = true;
  try {
    const res = await pullAction(envId.value, a);
    manualHistory.value.push({ action: res.action, reward: res.reward, isOptimal: res.isOptimal });
    algorithmsRunner.stepOnce();
    lastEventText.value = `Manuell: Arm ${a + 1} · Reward ${res.reward.toFixed(2)}${res.isOptimal ? " · ✅ optimal" : ""}`;
  } finally { busy.value = false; }
}

/* Log-Handler */
function onEnvLog(msg: string) { lastEventText.value = msg; }

/* Thumbnail-Infos */
function estimateText(idx: number) { const q = snapshot.value?.estimates[idx] ?? 0; return `${q.toFixed(0)}s`; }
function truthText(idx: number) {
  const cfg = snapshot.value?.config; if (!cfg) return "—";
  const mu = (cfg as any).means?.[idx]; const sd = (cfg as any).stdDev?.[idx];
  return mu != null && sd != null ? `${mu.toFixed(0)}s ± ${sd.toFixed(0)}s` : "—";
}

/* Tabelle */
const metricRows = computed<iMetricsRow[]>(() => {
  void algoRev.value;
  const rows: iMetricsRow[] = [];
  rows.push(buildMetricsRowFromManual(manualHistory.value, snapshot.value?.config, (seriesState as any).manual));
  for (const s of activeAlgoSeries.value) {
    rows.push(buildMetricsRowFromManual(algoHistory.value[s.id] ?? [], snapshot.value?.config, (seriesState as any)[s.id]));
  }
  return rows;
});

/* Chart */
const chartSeries = computed<iChartSeries[]>(() => {
  void algoRev.value;
  const out: iChartSeries[] = [];
  out.push(buildSeriesFromManual(manualHistory.value, snapshot.value?.config, (seriesState as any).manual));
  for (const s of activeAlgoSeries.value) {
    out.push(buildSeriesFromManual(algoHistory.value[s.id] ?? [], snapshot.value?.config, (seriesState as any)[s.id]));
  }
  return out;
});

/* Sichtbarkeiten */
function onToggleSeries({ seriesId, visible }: { seriesId: string; visible: boolean }) {
  setSeriesVisible(seriesId, visible);
}
function onChartToggle(payload: { id: string; visible: boolean }) {
  setSeriesVisible(payload.id, payload.visible);
}

/* Cleanup */
attachRunner(algorithmsRunner);
onBeforeUnmount(() => { algorithmsRunner.stop("Unmount"); offRunner?.(); });
</script>

<style>
.shell { min-height: 100vh; background: #0e0e0e; color: #fff; }
.bar { background: #111; border-bottom: 1px solid #1c1c1c; }
.bar-inner { width: 100%; margin: 0; padding: 12px 24px; display: flex; align-items: center; }
.brand { font-weight: 700; }
.wrap { width: 100%; margin: 0; padding: 16px 24px; }
.page-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.col-left, .col-right { display: flex; flex-direction: column; gap: 16px; }
.card { background: #141414; border: 1px solid #222; border-radius: 10px; padding: 12px; }
h2 { margin: 0 0 8px 0; }
.thumb-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.toast { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 10px 12px; border: 1px solid #2a2a2a; border-radius: 10px; background: #191919; }
.pill { display: inline-block; background: #1a1a1a; border: 1px solid #262626; border-radius: 999px; padding: 3px 8px; font-size: 12px; }
@media (max-width: 980px) { .page-grid { grid-template-columns: 1fr; } .thumb-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 620px) { .thumb-grid { grid-template-columns: 1fr; } }
</style>