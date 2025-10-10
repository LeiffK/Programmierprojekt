<template>
  <div class="shell">
    <header class="bar">
      <div class="bar-inner">
        <div class="brand">Bandit Lab</div>
        <div class="bar-actions">
          <button class="btn btn-ghost btn-pill" @click="showTopic = true">
            Thema verstehen
          </button>
          <button class="btn btn-primary btn-pill" @click="startTutorial">
            Anwendung verstehen
          </button>
        </div>
      </div>
    </header>

    <main class="wrap">
      <div class="page-grid">
        <div class="col-left">
          <div id="env-setup">
            <EnvSetup
              v-model="form"
              :busy="busy"
              @inited="onInited"
              @log="onEnvLog"
            >
              <template #actions>
                <ModeSwitch v-model="mode" @change="onModeChange" />
              </template>
            </EnvSetup>
          </div>

          <div id="advanced-settings">
            <AdvancedSettings
              :mode="mode"
              v-model:env="form"
              v-model:policyConfigs="policyConfigs"
              v-model:open="settingsOpen"
            />
          </div>

          <section id="manual-section" class="card" v-if="mode === 'manual'">
            <h2>Manuell testen</h2>
            <p class="muted">
              Jeder Klick triggert zusätzlich alle Algorithmen für einen
              Schritt.
            </p>

            <div class="thumb-grid">
              <ThumbnailCard
                v-for="i in form.arms"
                :key="i"
                :label="`Thumbnail ${String.fromCharCode(64 + i)}`"
                :variant="`Variante ${String.fromCharCode(64 + i)}`"
                :n="manualCounts[i - 1] || 0"
                :estimate="estimateText(i - 1)"
                :truth="truthText(i - 1)"
                @pick="onManual(i - 1)"
              />
            </div>

            <div class="toast">
              <div class="pill">Letztes Ereignis</div>
              <div>{{ lastEventText }}</div>
            </div>
          </section>

          <div id="runner-controls" v-else>
            <RunnerControls
              :env-config="form"
              :policy-configs="policyConfigs"
              @reset="onRunnerReset"
            />
          </div>
        </div>

        <div class="col-right">
          <section id="chart-area" class="card">
            <h2>Verläufe</h2>
            <ChartArea
              :key="chartKey"
              :series="chartSeries"
              v-model="chartMetric"
              @toggle="onChartToggle"
            />
          </section>

          <div id="debug-panel">
            <DebugPanel />
          </div>

          <ComparisonTable
            id="comparison-table"
            class="card"
            :rows="metricRows"
            :visibleMap="visibleMap"
            v-model:open="tableOpen"
            @toggleSeries="onToggleSeries"
          />
        </div>
      </div>
    </main>

    <!-- Modale / Overlays -->
    <TopicUnderstanding
      :open="showTopic"
      :html="topicHtml"
      @close="showTopic = false"
    />
    <AppTutorial
      :open="showTutorial"
      :hooks="tutorialHooks"
      @close="showTutorial = false"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";

/* UI-Komponenten */
import EnvSetup from "./components/EnvSetup.vue";
import AdvancedSettings from "./components/AdvancedSettings.vue";
import DebugPanel from "./components/DebugPanel.vue";
import ThumbnailCard from "./components/ThumbnailCard.vue";
import RunnerControls from "./components/RunnerControls.vue";
import ModeSwitch from "./components/ModeSwitch.vue";
import ChartArea from "./components/ChartArea.vue";
import ComparisonTable from "./components/ComparisonTable.vue";
import TopicUnderstanding from "./components/TopicUnderstanding.vue";
import AppTutorial from "./components/AppTutorial.vue";

/* Domain */
import type { ManualStep } from "./domain/iHistory";
import type { iMetricsRow } from "./domain/iMetrics";
import type { iChartSeries } from "./domain/chart/iChartSeries";
import type { ChartMetric } from "./domain/chart/iChartMetric";
import type { iEnvConfig } from "./env/Domain/iEnvConfig";
import { GaussianBanditEnv } from "./env/GaussianBanditEnv";
import type { CustomPolicyRegistration } from "./algorithms/Domain/iCustomPolicyRegistration";
import {
  getSeriesState,
  setSeriesVisible,
  resetSeriesStore,
  ensureSeries,
} from "./services/seriesStore";
import {
  buildMetricsRowFromManual,
  buildSeriesFromManual,
} from "./services/metrics";
import { algorithmsRunner } from "./services/algorithmsRunner";
import { attachRunner } from "./services/debugStore";

/* ---------------- Basiszustand ---------------- */
const form = ref<iEnvConfig>({ type: "gaussian", arms: 3, seed: 12345 });
const busy = ref(false);
const lastEventText = ref("—");
const mode = ref<"manual" | "algo">("manual");
const tableOpen = ref(false);
const settingsOpen = ref(false);
const chartMetric = ref<ChartMetric>("cumReward");
const chartKey = ref(0);

/* Manuelles Env */
const manualEnv = ref<GaussianBanditEnv | null>(null);
const manualHistory = ref<ManualStep[]>([]);
const manualCounts = ref<number[]>([]);
function initManualEnv() {
  manualEnv.value = new GaussianBanditEnv({ ...form.value });
  manualHistory.value = [];
  manualCounts.value = Array.from({ length: form.value.arms ?? 0 }, () => 0);
}

/* Policies-Konfiguration */
const policyConfigs = ref<any>({
  greedy: { optimisticInitialValue: 100 },
  epsgreedy: {
    epsilon: 0.1,
    optimisticInitialValue: 150,
    variants: [{ epsilon: 0.1, optimisticInitialValue: 150 }],
  },
  customPolicies: [] as CustomPolicyRegistration[],
});

/* Schätzungen & „Wahr“-Infos */
const manualEstimates = computed<number[]>(() => {
  const k = form.value.arms ?? 0,
    sum = Array(k).fill(0),
    cnt = Array(k).fill(0);
  for (const h of manualHistory.value) {
    sum[h.action] += h.reward;
    cnt[h.action] += 1;
  }
  return sum.map((s, i) => (cnt[i] ? s / cnt[i] : 0));
});
function estimateText(idx: number) {
  const c = manualCounts.value[idx] || 0;
  return c ? `${manualEstimates.value[idx].toFixed(0)}s` : "—";
}
function truthText(idx: number) {
  const cfg: any = manualEnv.value?.config;
  const mu = cfg?.means?.[idx];
  const sd = cfg?.stdDev?.[idx] ?? cfg?.sigma?.[idx];
  return mu != null && sd != null
    ? `${(+mu).toFixed(0)}s ± ${(+sd).toFixed(0)}s`
    : "—";
}

/* Serien-Store + Algo-Serien */
const seriesState = getSeriesState();
type ActiveSeries = { id: string; label: string; color: string };
const activeAlgoSeries = ref<ActiveSeries[]>([]);
const algoHistory = ref<Record<string, ManualStep[]>>({});

type TutorialStep = {
  attachTo: { element: string; on: "top" | "right" | "bottom" | "left" };
  title?: string;
  text?: string | string[];
  ensureOpen?: () => void | Promise<void>;
  afterShow?: () => void | Promise<void>;
  ghostClick?: boolean;
};

const PALETTE = [
  "#4fc3f7",
  "#f39c12",
  "#e91e63",
  "#9c27b0",
  "#00bcd4",
  "#8bc34a",
  "#ffc107",
  "#ff5722",
  "#03a9f4",
  "#cddc39",
];
let paletteIdx = 0;
const nextColor = () => PALETTE[paletteIdx++ % PALETTE.length];

function getCustomPolicies(): CustomPolicyRegistration[] {
  const list = policyConfigs.value?.customPolicies;
  return Array.isArray(list) ? (list as CustomPolicyRegistration[]) : [];
}
function isCustomSeries(id: string): boolean {
  return typeof id === "string" && id.startsWith("custom:");
}
function expectedAlgoIds(): string[] {
  const eg: any = policyConfigs.value?.epsgreedy ?? {};
  const list =
    Array.isArray(eg.variants) && eg.variants.length
      ? eg.variants
      : [
          {
            epsilon: eg.epsilon ?? 0.1,
            optimisticInitialValue: eg.optimisticInitialValue ?? 150,
          },
        ];
  const ids: string[] =
    list.length === 1
      ? ["greedy", "epsgreedy"]
      : ["greedy", ...list.map((_v: any, i: number) => `epsgreedy#${i + 1}`)];
  getCustomPolicies().forEach((cp) => ids.push(cp.id));
  return ids.filter((id, idx) => ids.indexOf(id) === idx);
}
function prettyLabelFromId(id: string) {
  if (id === "greedy") return "Greedy";
  if (id === "epsgreedy") {
    const eps = Number(
      policyConfigs.value?.epsgreedy?.epsilon ??
        policyConfigs.value?.epsgreedy?.variants?.[0]?.epsilon ??
        0.1,
    );
    return `ε-Greedy (ε=${eps.toFixed(2)})`;
  }
  const m = id.match(/^epsgreedy#(\d+)$/);
  if (m) {
    const idx = Number(m[1]) - 1;
    const v = policyConfigs.value?.epsgreedy?.variants?.[idx];
    const eps = Number(v?.epsilon ?? 0.1);
    return `ε-Greedy v${m[1]} (ε=${eps.toFixed(2)})`;
  }
  const custom = getCustomPolicies().find((cp) => cp.id === id);
  if (custom) return custom.name;
  return id;
}
function setSeriesLabelLocal(id: string, label: string) {
  const s = (seriesState as any)[id];
  if (s && typeof s === "object") s.label = label;
  const idx = activeAlgoSeries.value.findIndex((a) => a.id === id);
  if (idx >= 0)
    activeAlgoSeries.value[idx] = { ...activeAlgoSeries.value[idx], label };
}
function reconcileActiveSeries() {
  const expected = new Set(expectedAlgoIds());
  const newList: ActiveSeries[] = [];
  expected.forEach((id) => {
    const color = (seriesState as any)[id]?.color ?? nextColor();
    const label = prettyLabelFromId(id);
    ensureSeries(id, label, color);
    newList.push({ id, label, color });
    if (!algoHistory.value[id]) algoHistory.value[id] = [];
  });
  activeAlgoSeries.value = newList;
  newList.forEach((s) => setSeriesLabelLocal(s.id, prettyLabelFromId(s.id)));
}
function isManualSeriesLike(obj: any) {
  if (!obj) return false;
  const id = String(obj.id ?? "");
  const label = String(obj.label ?? "");
  const color = String(obj.color ?? "");
  return (
    id === "manual" ||
    /manuell/i.test(label) ||
    color.toLowerCase() === "#4caf50"
  );
}
function purgeManualSeriesHard() {
  try {
    setSeriesVisible("manual", false);
  } catch {}
  try {
    delete (seriesState as any).manual;
  } catch {}
  manualHistory.value = [];
  manualCounts.value = Array.from({ length: form.value.arms ?? 0 }, () => 0);
}

/* Runner-Events */
const offRunner = algorithmsRunner.on((msg: any) => {
  if (msg.type === "CONFIGURED") {
    reconcileActiveSeries();
    lastEventText.value = "Konfiguriert.";
  }
  if (msg.type === "STARTED")
    lastEventText.value = "Automatischer Lauf gestartet.";
  if (msg.type === "PAUSED") lastEventText.value = "Pausiert.";
  if (msg.type === "STOPPED")
    lastEventText.value = `Gestoppt: ${msg.payload?.reason ?? "—"}`;
  if (msg.type === "RESULT") {
    const id = String(msg.payload.policyId);
    if (!expectedAlgoIds().includes(id)) return;
    (algoHistory.value[id] ??= []).push({
      action: msg.payload.action,
      reward: msg.payload.reward,
      isOptimal: msg.payload.isOptimal,
    });
  }
});

function configureAlgoRunner() {
  algorithmsRunner.configure({
    envConfig: form.value,
    totalSteps: 0,
    rate: 1,
    policyConfigs: policyConfigs.value,
  });
}

/* Sichtbarkeiten (Table/Chart) */
const visibleMap = computed<Record<string, boolean>>(() => {
  const out: Record<string, boolean> = {};
  const s = seriesState as any;
  if (mode.value === "manual" && s.manual)
    out["manual"] = s.manual.visible ?? true;
  for (const a of activeAlgoSeries.value) out[a.id] = s[a.id]?.visible ?? true;
  return out;
});

/* Harte Mode-Resets */
function hardResetForMode(newMode: "manual" | "algo") {
  try {
    algorithmsRunner.stop("mode-switch");
  } catch {}
  resetSeriesStore();
  manualHistory.value = [];
  manualCounts.value = Array.from({ length: form.value.arms ?? 0 }, () => 0);
  algoHistory.value = {};
  activeAlgoSeries.value = [];
  paletteIdx = 0;
  try {
    if ((seriesState as any).manual) delete (seriesState as any).manual;
    Object.keys(seriesState as any).forEach((k) => {
      if (/^manual$/i.test(k)) delete (seriesState as any)[k];
    });
  } catch {}
  if (newMode === "manual") ensureSeries("manual", "Manuell", "#4caf50");
  else purgeManualSeriesHard();
  reconcileActiveSeries();
  configureAlgoRunner();
  initManualEnv();
  chartKey.value++;
}

/* Events */
function onRunnerReset() {
  hardResetForMode(mode.value);
}
function onModeChange() {
  const m = mode.value;
  lastEventText.value = `Modus: ${m === "manual" ? "Manuell" : "Algorithmisch"}`;
  hardResetForMode(m);
}
function onInited(payload?: { optimalAction?: number }) {
  lastEventText.value =
    payload?.optimalAction != null
      ? `Init – optimaler Arm: ${payload.optimalAction}`
      : "Initialisiert";
  hardResetForMode(mode.value);
}
async function onManual(a: number) {
  if (!manualEnv.value) return;
  busy.value = true;
  try {
    const res = manualEnv.value.pull(a);
    manualHistory.value.push({
      action: res.action,
      reward: res.reward,
      isOptimal: res.isOptimal,
    });
    manualCounts.value[a] = (manualCounts.value[a] || 0) + 1;
    const st = algorithmsRunner.getStatus();
    if (st === "CONFIGURED" || st === "PAUSED") algorithmsRunner.stepOnce();
    lastEventText.value = `Manuell: Arm ${a + 1} · Reward ${res.reward.toFixed(2)}${res.isOptimal ? " · ✅ optimal" : ""}`;
  } finally {
    busy.value = false;
  }
}
function onEnvLog(msg: string) {
  lastEventText.value = msg;
}

function calcOptimalRateFrom(history: ManualStep[] | undefined) {
  if (!history || !history.length) return undefined;
  let ok = 0;
  for (const h of history) if (h.isOptimal) ok++;
  return ok / history.length;
}
type MetricsRowX = iMetricsRow & { seriesId?: string; optimalRate?: number };

const metricRows = computed<MetricsRowX[]>(() => {
  const rows: MetricsRowX[] = [];
  if (mode.value === "manual" && (seriesState as any).manual) {
    const r = buildMetricsRowFromManual(
      manualHistory.value,
      form.value,
      (seriesState as any).manual,
    );
    rows.push({
      ...(r as iMetricsRow),
      seriesId: "manual",
      optimalRate: calcOptimalRateFrom(manualHistory.value),
      type: "manual",
    });
  }
  for (const s of activeAlgoSeries.value) {
    const hist = algoHistory.value[s.id] ?? [];
    const r = buildMetricsRowFromManual(
      hist,
      form.value,
      (seriesState as any)[s.id],
    );
    rows.push({
      ...(r as iMetricsRow),
      seriesId: s.id,
      optimalRate: calcOptimalRateFrom(hist),
      type: isCustomSeries(s.id) ? "custom" : (r.kind ?? "algo"),
    });
  }
  if (mode.value === "algo") return rows.filter((r) => r.seriesId !== "manual");
  return rows;
});

const chartSeries = computed<iChartSeries[]>(() => {
  const out: iChartSeries[] = [];
  if (mode.value === "manual" && (seriesState as any).manual) {
    const s = buildSeriesFromManual(
      manualHistory.value,
      form.value,
      (seriesState as any).manual,
    );
    if (!isManualSeriesLike(s) || mode.value === "manual") out.push(s);
  }
  for (const s of activeAlgoSeries.value) {
    const built = buildSeriesFromManual(
      algoHistory.value[s.id] ?? [],
      form.value,
      (seriesState as any)[s.id],
    );
    if (mode.value === "algo" && isManualSeriesLike(built)) continue;
    out.push(built);
  }
  if (mode.value === "algo") return out.filter((ss) => !isManualSeriesLike(ss));
  return out;
});

function onToggleSeries({
  seriesId,
  visible,
}: {
  seriesId: string;
  visible: boolean;
}) {
  setSeriesVisible(seriesId, visible);
}
function onChartToggle(payload: { id: string; visible: boolean }) {
  setSeriesVisible(payload.id, payload.visible);
}

/* Lifecycle */
onMounted(() => {
  attachRunner(algorithmsRunner);
  hardResetForMode(mode.value);
});
onBeforeUnmount(() => offRunner?.());
watch(
  form,
  () => {
    if (mode.value === "manual") initManualEnv();
  },
  { deep: true },
);
watch(
  policyConfigs,
  () => {
    reconcileActiveSeries();
    configureAlgoRunner();
  },
  { deep: true },
);

/* ---------------- Info/Overlays ---------------- */
/* Thema verstehen (HTML) */
const showTopic = ref(false);
const topicHtml = `
  <h2>Multi-Armed-Bandits — Überblick</h2>
  <p>Banditenprobleme modellieren Sequenzen von Entscheidungen unter Unsicherheit. In jedem Schritt wird ein Arm gewählt, eine Belohnung realisiert und das Wissen aktualisiert.</p>
  <h3>Exploration vs. Exploitation</h3>
  <ul>
    <li><b>Exploration</b>: neue Informationen sammeln</li>
    <li><b>Exploitation</b>: aktuelle beste Option nutzen</li>
  </ul>
  <h3>Policies</h3>
  <ul>
    <li><b>Greedy</b>: wählt stets den höchsten aktuellen Erwartungswert</li>
    <li><b>ε-Greedy</b>: mit Wahrscheinlichkeit ε explorieren, sonst exploiten</li>
    <li><b>UCB</b> (später): optimistische Schranken für wohldosierte Exploration</li>
  </ul>
  <h3>KPIs</h3>
  <ul>
    <li>Kumulierter und durchschnittlicher Reward, Best-Quote (Anteil optimaler Züge), Regret (optional)</li>
  </ul>
`;

const showTutorial = ref(false);
function startTutorial() {
  showTutorial.value = true;
}

const tutorialHooks = {
  // Baseline – VOR und NACH dem Tutorial
  resetBaseline: async () => {
    // Modus manuell
    if (mode.value !== "manual") {
      mode.value = "manual";
      onModeChange();
      await nextTick();
    }
    // Runner stoppen
    try {
      algorithmsRunner.stop("tutorial-baseline");
    } catch {}
    // Stores & Historien leeren
    onRunnerReset?.(); // falls das hart alles zurücksetzt (SeriesStore, Historien)
    // exakt 3 Thumbnails
    form.value.arms = 3;
    // Advanced/Table zu
    settingsOpen.value = false;
    tableOpen.value = false;
    await nextTick();
  },
  restoreBaseline: async () => {
    // gleicher Zustand wie resetBaseline – garantiert reproduzierbar
    if (mode.value !== "manual") {
      mode.value = "manual";
      onModeChange();
      await nextTick();
    }
    try {
      algorithmsRunner.stop("tutorial-restore");
    } catch {}
    onRunnerReset?.();
    form.value.arms = 3;
    settingsOpen.value = false;
    tableOpen.value = false;
    await nextTick();
  },

  // Env/Stepper
  incArms: () => {
    form.value.arms = Math.max(1, (form.value.arms ?? 1) + 1);
  },
  decArms: () => {
    form.value.arms = Math.max(1, (form.value.arms ?? 1) - 1);
  },

  // Advanced
  openAdvanced: () => {
    settingsOpen.value = true;
  },
  closeAdvanced: () => {
    settingsOpen.value = false;
  },

  // Mode
  switchToManual: async () => {
    if (mode.value !== "manual") {
      mode.value = "manual";
      onModeChange();
      await nextTick();
    }
  },
  switchToAlgo: async () => {
    if (mode.value !== "algo") {
      mode.value = "algo";
      onModeChange();
      await nextTick();
    }
  },

  // Manual actions
  manualClick: async (i: number) => {
    await onManual(i);
  },

  // Runner
  runnerStart: async () => {
    try {
      algorithmsRunner.start();
    } catch {}
  },
  runnerPause: async () => {
    try {
      algorithmsRunner.pause();
    } catch {}
  },

  // Chart/Metrics/Series
  setMetric: async (m: string) => {
    chartMetric.value = m as any;
    await nextTick();
  },
  toggleSeries: async (id: string, v: boolean) => {
    setSeriesVisible(id, v);
    await nextTick();
  },

  // Table
  openTable: async () => {
    tableOpen.value = true;
    await nextTick();
  },
  closeTable: async () => {
    tableOpen.value = false;
    await nextTick();
  },
};
</script>

<style>
/* Header */
.shell {
  min-height: 100vh;
  background: #0e0e0e;
  color: #fff;
}
.bar {
  background: #111;
  border-bottom: 1px solid #1c1c1c;
  position: sticky;
  top: 0;
  z-index: 50;
}
.bar-inner {
  width: 100%;
  margin: 0;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.brand {
  font-weight: 700;
  white-space: nowrap;
}
.bar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}
.btn {
  height: 36px;
  line-height: 36px;
  padding: 0 14px;
  border: 1px solid #2d2d2d;
  background: #171717;
  color: #eaeaea;
  border-radius: 10px;
  cursor: pointer;
}
.btn:hover {
  background: #1b1b1b;
}
.btn-pill {
  border-radius: 999px;
}
.btn-ghost {
  background: #161616;
}
.btn-primary {
  background: #1f2a44;
  border-color: #2b3a5c;
}
.btn-primary:hover {
  background: #243255;
}

/* Layout */
.wrap {
  width: 100%;
  margin: 0;
  padding: 16px 24px;
}
.page-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.col-left,
.col-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.card {
  background: #141414;
  border: 1px solid #222;
  border-radius: 10px;
  padding: 12px;
}
h2 {
  margin: 0 0 8px 0;
}
.thumb-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  background: #191919;
}
.pill {
  display: inline-block;
  background: #1a1a1a;
  border: 1px solid #262626;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 12px;
}
.muted {
  color: #9aa0a6;
}

/* Responsive */
@media (max-width: 980px) {
  .page-grid {
    grid-template-columns: 1fr;
  }
  .thumb-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 620px) {
  .thumb-grid {
    grid-template-columns: 1fr;
  }
}
</style>
