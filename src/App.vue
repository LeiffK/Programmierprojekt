<template>
  <div class="shell">
    <header class="bar">
      <div class="bar-inner">
        <!-- kleine Brand-Ecke. Wow, so minimalistisch. -->
        <div class="brand">Bandit Lab</div>
      </div>
    </header>

    <main class="wrap">
      <div class="page-grid">
        <!--  LINKS: Setup, Modus & Interaktion (manuell/worker) -->
        <div class="col-left">
          <!--  hier wird das Environment zurechtgebastelt -->
          <EnvSetup
            v-model="form"
            :busy="busy"
            @inited="onInited"
            @log="setLast"
          >
            <!-- Modus-Schalter: „Manuell“ oooder „Algorithmus“    -->
            <template #actions>
              <ModeSwitch v-model="mode" @change="onModeChange" />
            </template>
          </EnvSetup>

          <!-- jeder Klick = 1 Zuschauer -->
          <section class="card" v-if="mode === 'manual'">
            <h2>Manuell testen</h2>
            <p class="muted">Ein Klick entspricht genau einem Zuschauer.</p>

            <!-- Thumbnails -->
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

          <!-- Falls der Modus „Algorithmus“ ist: Worker-Steuerung (Start/Pause etc.) -->
          <RunnerControls
            v-else
            :envId="envId || null"
            :arms="snapshot?.config?.arms || form.arms"
          />
        </div>

        <!-- RECHTS: Chart oben, Debug & Tabelle unten -->
        <div class="col-right">
          <section class="card">
            <h2>Verläufe</h2>
            <!-- Chart bekommt:
                 - series: die Daten (z.B. manuell, später algos)
                 - v-model: aktive Kennzahl (Σ, Ø, Regret, ...)
                 - @toggle: Sichtbarkeit einzelner Serien (Pillen oben) -->
            <ChartArea
              :series="chartSeries"
              v-model="chartMetric"
              @toggle="onChartToggle"
            />
          </section>

          <!-- Debug-Panel: kommt später weg. -->
          <DebugPanel :snapshot="snapshot" :lastResult="lastResult" />

          <!-- Vergleichstabelle  -->
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
import { computed, ref } from "vue";
import type { iEnvConfig } from "@/env/Domain/iEnvConfig";
import { getEnvSnapshot, pullAction } from "@/api/banditClient";

/* UI */
import EnvSetup from "@/components/EnvSetup.vue";
import DebugPanel from "@/components/DebugPanel.vue";
import ThumbnailCard from "@/components/ThumbnailCard.vue";
import RunnerControls from "@/components/RunnerControls.vue";
import ModeSwitch from "@/components/ModeSwitch.vue";
import ChartArea from "@/components/ChartArea.vue";
import ComparisonTable from "@/components/ComparisonTable.vue";

/* Domain/Services */
import type { ManualStep } from "@/domain/iHistory";
import type { iMetricsRow } from "@/domain/iMetrics";
import type { iChartSeries } from "@/domain/chart/iChartSeries";
import type { ChartMetric } from "@/domain/chart/iChartMetric";
import { getSeriesState, setSeriesVisible, resetSeriesStore, ensureSeries } from "@/services/seriesStore";
import { ensurePolicies } from "@/services/seriesStore";
import { buildMetricsRowFromHistory, buildSeriesFromHistory } from "@/services/metrics";
import { algorithmsRunner } from "@/services/algorithmsRunner";

type EnvSnapshot = {
  config: iEnvConfig;
  optimalAction: number;
  counts: number[];
  estimates: number[];
};

const form = ref<iEnvConfig>({ type: "gaussian", arms: 6, seed: 12345 });
const envId = ref("");
const busy = ref(false);

const snapshot = ref<EnvSnapshot | null>(null);
const lastResult = ref("");
const lastEventText = ref("—");
const mode = ref<"manual" | "algo">("manual");

const tableOpen = ref(false);
const chartMetric = ref<ChartMetric>("cumReward");

/* Historien */
const manualHistory = ref<ManualStep[]>([]);

/* Sichtbarkeiten/Farben */
const seriesState = getSeriesState();

function setLast(msg: string) { lastResult.value = msg; }
function onModeChange(v: "manual" | "algo") {
  setLast(`Modus gewechselt: ${v === "manual" ? "Manuell" : "Algorithmus"}`);
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
  const mu = cfg.means?.[idx]; const sd = cfg.stdDev?.[idx];
  return mu != null && sd != null ? `${mu.toFixed(0)}s ± ${sd.toFixed(0)}s` : "—";
}

function onInited({ envId: id }: { envId: string; optimalAction: number }) {
  envId.value = id;
  manualHistory.value = [];

  // Sichtbarkeiten/Farben zurücksetzen & vorhanden machen
  resetSeriesStore();
  ensureSeries("manual", "Manuell", "#4caf50");
  ensurePolicies();

  refresh(); // snapshot füllen
  // Policies auf Basis der echten Env-Konfig starten (Shadow-Env)
  if (snapshot.value) algorithmsRunner.init(snapshot.value.config);
}

async function onManual(a: number) {
  if (!envId.value) return;
  busy.value = true;
  try {
    const res = await pullAction(envId.value, a);
    manualHistory.value.push({ action: res.action, reward: res.reward, isOptimal: res.isOptimal });

    // Policies einmal mitziehen
    algorithmsRunner.stepAll();

    setLast(JSON.stringify({ manual: true, ...res }, null, 2));
    lastEventText.value = `Thumbnail ${String.fromCharCode(65 + a)} → Watchtime ${res.reward.toFixed(0)}s · optimal: ${res.isOptimal ? "ja" : "nein"}`;
    refresh();
  } catch (e: any) {
    setLast(`Fehler: ${e?.message ?? e}`);
    console.error(e);
  } finally {
    busy.value = false;
  }
}

/* --- Tabelle: Manuell + Policies --- */
const metricRows = computed<iMetricsRow[]>(() => {
  const cfg = snapshot.value?.config;
  const rows: iMetricsRow[] = [];

  // Manuell
  rows.push(
      buildMetricsRowFromHistory(
          "manual",
          "Manuell",
          "manual",
          manualHistory.value,
          cfg,
          seriesState.manual,
      ),
  );

  // Policies
  for (const p of algorithmsRunner.getAll()) {
    const s = seriesState[p.id] ?? { color: p.color, visible: true }; // fallback
    rows.push(
        buildMetricsRowFromHistory(p.id, p.label, "algo", p.history, cfg, s),
    );
  }
  return rows;
});

/* --- Chart: Manuell + Policies --- */
const chartSeries = computed<iChartSeries[]>(() => {
  const cfg = snapshot.value?.config;
  const out: iChartSeries[] = [];

  // Manuell
  out.push(
      buildSeriesFromHistory("manual", "Manuell", "manual", manualHistory.value, cfg, seriesState.manual),
  );

  // Policies
  for (const p of algorithmsRunner.getAll()) {
    const s = seriesState[p.id] ?? { color: p.color, visible: true };
    out.push(
        buildSeriesFromHistory(p.id, p.label, "algo", p.history, cfg, s),
    );
  }
  return out;
});

/* Sichtbarkeit toggeln (von Tabelle und vom Chart aus) */
function onToggleSeries({ seriesId, visible }: { seriesId: string; visible: boolean }) {
  setSeriesVisible(seriesId, visible);
}
function onChartToggle({ id, visible }: { id: string; visible: boolean }) {
  setSeriesVisible(id, visible);
}
</script>

<style scoped>
/*  wir wollen volle Breite. */
.wrap {
  max-width: none;
  width: 100%;
  padding: 20px 24px;
  box-sizing: border-box;
}

/* Kopfzele */
.bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 0 24px;
  box-sizing: border-box;
}

/* Zwei-Spalten */
.page-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: 50% 50%;
}

.col-right {
  position: relative;
}

/* Thumbnails: drei pro Reihe. */
.thumb-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(3, 1fr);
}

/* kleines Toast-Element  */
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

/* für mobile und kleinere displays */
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
