<template>
  <div class="shell">
    <header class="bar">
      <div class="bar-inner">
        <div class="brand">Bandit Lab</div>
      </div>
    </header>

    <main class="wrap">
      <div class="page-grid">
        <!-- Linke Spalte: Environment + Interaktion -->
        <div class="col-left">
          <EnvSetup
            v-model="form"
            :busy="busy"
            @inited="onInited"
            @log="setLast"
          >
            <template #actions>
              <ModeSwitch v-model="mode" @change="onModeChange" />
            </template>
          </EnvSetup>

          <!-- Manuell: Klick = Zuschauer; Algorithmen steppen mit -->
          <section class="card" v-if="mode === 'manual'">
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
                :n="snapshot?.counts[i - 1] || 0"
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

          <!-- Algorithmus-Modus -->
          <RunnerControls
            v-else
            :envId="envId || null"
            :arms="snapshot?.config?.arms || form.arms"
          />
        </div>

        <!-- Rechte Spalte: Chart + Debug + Tabelle -->
        <div class="col-right">
          <section class="card">
            <h2>Verläufe</h2>
            <ChartArea
              :series="chartSeries"
              v-model="chartMetric"
              @toggle="onChartToggle"
            />
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
import { computed, ref, onBeforeUnmount } from "vue";

import type { iEnvConfig } from "./env/Domain/iEnvConfig";
import { getEnvSnapshot, pullAction } from "./api/banditClient";

import EnvSetup from "./components/EnvSetup.vue";
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
import { debug, attachRunner } from "./services/debugStore";

type EnvSnapshot = {
  config: iEnvConfig;
  optimalAction: number;
  counts: number[];
  estimates: number[];
};

const algoCatalog = [
  { id: "greedy", label: "Greedy", color: "#4fc3f7" },
  { id: "epsgreedy", label: "ε-Greedy", color: "#f39c12" },
] as const;
type AlgoId = (typeof algoCatalog)[number]["id"];

const form = ref<iEnvConfig>({ type: "gaussian", arms: 6, seed: 12345 });
const envId = ref("");
const busy = ref(false);

const snapshot = ref<EnvSnapshot | null>(null);
const lastResult = ref("");
const lastEventText = ref("—");

const mode = ref<"manual" | "algo">("manual");
const tableOpen = ref(false);
const chartMetric = ref<ChartMetric>("cumReward");

const manualHistory = ref<ManualStep[]>([]);
const seriesState = getSeriesState();

const algoHistory = ref<Record<string, ManualStep[]>>(
  Object.fromEntries(algoCatalog.map((a) => [a.id, []])),
);

// rAF-Drosselung für Re-Renders
const algoRev = ref(0);
let rafPending = false;
function scheduleRender() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    algoRev.value++;
  });
}

/* Runner-Events global ins Debug-Panel streamen */
const offDebugRunner = attachRunner(algorithmsRunner);

/* Helpers */
function setLast(msg: string) {
  lastResult.value = msg;
  debug.log(msg, "info");
}
function onModeChange(v: "manual" | "algo") {
  const txt = `Modus gewechselt: ${v === "manual" ? "Manuell" : "Algorithmus"}`;
  setLast(txt); // kein zweiter debug.log → vermeidet Duplikate
}
function refresh() {
  if (!envId.value) return;
  snapshot.value = getEnvSnapshot(envId.value);
}
function estimateText(idx: number) {
  const q = snapshot.value?.estimates[idx] ?? 0;
  return `${q.toFixed(0)}s`;
}
function truthText(idx: number) {
  const cfg = snapshot.value?.config;
  if (!cfg) return "—";
  const mu = (cfg as any).means?.[idx];
  const sd = (cfg as any).stdDev?.[idx];
  return mu != null && sd != null
    ? `${mu.toFixed(0)}s ± ${sd.toFixed(0)}s`
    : "—";
}

/* Serien dauerhaft registrieren (Pillen) */
ensureSeries("manual", "Manuell", "#4caf50");
for (const a of algoCatalog) ensureSeries(a.id, a.label, a.color);

/* Runner-Konfiguration für aktuelles Env */
function configureAlgoRunnerForCurrentEnv() {
  if (!envId.value) return;
  const snap = getEnvSnapshot(envId.value);
  if (!snap?.config) return;

  algorithmsRunner.configure({
    envConfig: snap.config,
    totalSteps: 0, // open-ended: nur stepOnce() on demand
    rate: 1,
  });
}

/* Env initialisiert */
function onInited({
  envId: id,
  optimalAction,
}: {
  envId: string;
  optimalAction: number;
}) {
  envId.value = id;

  manualHistory.value = [];

  resetSeriesStore();
  ensureSeries("manual", "Manuell", "#4caf50");
  for (const a of algoCatalog) ensureSeries(a.id, a.label, a.color);

  for (const a of algoCatalog) algoHistory.value[a.id] = [];
  scheduleRender();

  refresh();
  configureAlgoRunnerForCurrentEnv();

  debug.log(
    `Environment initialisiert · envId=${id.slice(0, 8)}… · optimal=${optimalAction}`,
    "env",
    { envId: id, optimalAction },
  );
}

/* Manuelle Interaktion: zusätzlich alle Algorithmen steppen */
async function onManual(a: number) {
  if (!envId.value) return;

  if (algorithmsRunner.getStatus() === "IDLE") {
    configureAlgoRunnerForCurrentEnv();
  }

  busy.value = true;
  try {
    const res = await pullAction(envId.value, a);
    manualHistory.value.push({
      action: res.action,
      reward: res.reward,
      isOptimal: res.isOptimal,
    });

    const logMsg = `Manuell · Arm ${String.fromCharCode(65 + a)} · r=${res.reward.toFixed(2)} · ${
      res.isOptimal ? "optimal" : "suboptimal"
    }`;
    setLast(JSON.stringify({ manual: true, ...res }, null, 2));
    lastEventText.value = `Thumbnail ${String.fromCharCode(65 + a)} → Watchtime ${res.reward.toFixed(
      0,
    )}s · optimal: ${res.isOptimal ? "ja" : "nein"}`;
    debug.log(logMsg, "result", res);

    algorithmsRunner.stepOnce(); // ein Schritt für alle Policies
    refresh();
    scheduleRender();
  } catch (e: any) {
    setLast(`Fehler: ${e?.message ?? e}`);
    debug.error(`Manueller Zug fehlgeschlagen: ${e?.message ?? e}`);
    console.error(e);
  } finally {
    busy.value = false;
  }
}

/* Runner-Events → Algorithmen-Historie (nur UI-State, kein Logging hier) */
const offRunner = algorithmsRunner.on((e) => {
  switch (e.type) {
    case "CONFIGURED": {
      for (const m of algorithmsRunner.getAll()) {
        ensureSeries(m.id, m.label, m.color);
        if (!algoHistory.value[m.id]) algoHistory.value[m.id] = [];
      }
      scheduleRender();
      break;
    }
    case "RESULT": {
      const id = e.payload.policyId as AlgoId;
      const arr = algoHistory.value[id] ?? (algoHistory.value[id] = []);
      arr.push({
        action: e.payload.action,
        reward: e.payload.reward,
        isOptimal: e.payload.isOptimal,
      });
      scheduleRender();
      break;
    }
    default:
      break;
  }
});

onBeforeUnmount(() => {
  offRunner();
  offDebugRunner?.();
});

/* Tabelle */
const metricRows = computed<iMetricsRow[]>(() => {
  void algoRev.value; // rAF-getaktet
  const rows: iMetricsRow[] = [];

  rows.push(
    buildMetricsRowFromManual(
      manualHistory.value,
      snapshot.value?.config,
      seriesState.manual,
    ),
  );
  for (const a of algoCatalog) {
    const s = (seriesState as any)[a.id];
    rows.push(
      buildMetricsRowFromManual(
        algoHistory.value[a.id] ?? [],
        snapshot.value?.config,
        s,
      ),
    );
  }
  return rows;
});

/* Chart */
const chartSeries = computed<iChartSeries[]>(() => {
  void algoRev.value; // rAF-getaktet
  const out: iChartSeries[] = [];

  out.push(
    buildSeriesFromManual(
      manualHistory.value,
      snapshot.value?.config,
      seriesState.manual,
    ),
  );
  for (const a of algoCatalog) {
    const s = (seriesState as any)[a.id];
    out.push(
      buildSeriesFromManual(
        algoHistory.value[a.id] ?? [],
        snapshot.value?.config,
        s,
      ),
    );
  }
  return out;
});

/* Sichtbarkeiten syncen */
function onToggleSeries({
  seriesId,
  visible,
}: {
  seriesId: string;
  visible: boolean;
}) {
  setSeriesVisible(seriesId, visible);
}
function onChartToggle({ id, visible }: { id: string; visible: boolean }) {
  setSeriesVisible(id, visible);
}
</script>

<style scoped>
.wrap {
  max-width: none;
  width: 100%;
  padding: 20px 24px;
  box-sizing: border-box;
}

.bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 0 24px;
  box-sizing: border-box;
}

.page-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: 50% 50%;
}

.col-right {
  position: relative;
}

.thumb-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(3, 1fr);
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
  background: #ff0000;
  color: #fff;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
}

@media (max-width: 1200px) {
  .page-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 980px) {
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
