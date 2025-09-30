<template>
  <div class="shell">
    <header class="bar">
      <div class="bar-inner">
        <div class="brand">Bandit Lab</div>
      </div>
    </header>

    <main class="wrap">
      <EnvSetup v-model="form" :busy="busy" @inited="onInited" @log="setLast">
        <template #actions>
          <ModeSwitch v-model="mode" @change="onModeChange" />
        </template>
      </EnvSetup>

      <DebugPanel :snapshot="snapshot" :lastResult="lastResult" />

      <!-- Manuell -->
      <section class="card" v-if="mode === 'manual'">
        <h2>Manuell testen</h2>
        <p class="muted">Ein Klick entspricht genau einem Zuschauer.</p>

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

      <!-- Algorithmus / Worker -->
      <RunnerControls
        v-if="mode === 'algo'"
        :envId="envId || null"
        :arms="snapshot?.config?.arms || form.arms"
      />

      <!-- Vergleichs-Tabelle immer sichtbar (einklappbar) -->
      <ComparisonTable
        :rows="rows"
        v-model:open="tableOpen"
        @toggleSeries="onToggleSeries"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { iEnvConfig } from "./env/Domain/iEnvConfig.js";
import { getEnvSnapshot, pullAction } from "./api/banditClient";

import EnvSetup from "./components/EnvSetup.vue";
import DebugPanel from "./components/DebugPanel.vue";
import ThumbnailCard from "./components/ThumbnailCard.vue";
import RunnerControls from "./components/RunnerControls.vue";
import ModeSwitch from "./components/ModeSwitch.vue";

// neu:
import ComparisonTable from "./components/ComparisonTable.vue";
import type { iMetricsRow } from "./domain/iMetrics";

// --- Environment Snapshot Typ
type EnvSnapshot = {
  config: iEnvConfig;
  optimalAction: number;
  counts: number[];
  estimates: number[];
};

// --- State
const form = ref<iEnvConfig>({ type: "gaussian", arms: 6, seed: 12345 });
const envId = ref<string>("");
const busy = ref(false);

const snapshot = ref<EnvSnapshot | null>(null);
const lastResult = ref<string>("");
const lastEventText = ref<string>("—");

// Modus
const mode = ref<"manual" | "algo">("manual");

// --- Vergleichs-Tabelle: eine Manuell-Serie; Algos kommen später als extra rows
const tableOpen = ref(true);
const rows = ref<iMetricsRow[]>([
  {
    seriesId: "manual",
    label: "Manuell",
    kind: "manual",
    n: 0,
    cumReward: 0,
    avgReward: 0,
    optimalPulls: 0,
    bestChoiceRate: 0,
    regret: 0,
    visible: true,
  },
]);

// Helfer: bester erwarteter Reward (für Gaussian = max(μ))
function bestExpectedReward(): number {
  const mu = snapshot.value?.config.means;
  return Array.isArray(mu) && mu.length ? Math.max(...mu) : 0;
}

// manuelle Serie hochzählen
function upsertManualRow(
  lastAction: number,
  lastReward: number,
  wasOptimal: boolean,
) {
  const r = rows.value[0]; // hier nur "Manuell" – Algos hängen wir später dazu
  r.n += 1;
  r.cumReward += lastReward;
  r.avgReward = r.cumReward / r.n;
  if (wasOptimal) r.optimalPulls += 1;
  r.bestChoiceRate = r.n > 0 ? r.optimalPulls / r.n : 0;
  r.regret += Math.max(0, bestExpectedReward() - lastReward);
  r.lastAction = lastAction;
  r.lastReward = lastReward;
}

function onToggleSeries(p: { seriesId: string; visible: boolean }) {
  const idx = rows.value.findIndex((x) => x.seriesId === p.seriesId);
  if (idx >= 0) rows.value[idx].visible = p.visible;
}

// --- UI helpers
function setLast(msg: string) {
  lastResult.value = msg;
}
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
  const mu = cfg.means?.[idx];
  const sd = cfg.stdDev?.[idx];
  return mu != null && sd != null
    ? `${mu.toFixed(0)}s ± ${sd.toFixed(0)}s`
    : "—";
}

function onInited({ envId: id }: { envId: string; optimalAction: number }) {
  envId.value = id;
  refresh();
}

async function onManual(a: number) {
  if (!envId.value) return;
  busy.value = true;
  try {
    const res = await pullAction(envId.value, a);
    setLast(JSON.stringify({ manual: true, ...res }, null, 2));
    lastEventText.value = `Thumbnail ${String.fromCharCode(65 + a)} → Watchtime ${res.reward.toFixed(0)}s · optimal: ${res.isOptimal ? "ja" : "nein"}`;

    // <- Tabelle aktualisieren (ja, live!)
    upsertManualRow(a, res.reward, res.isOptimal);

    refresh();
  } catch (e: any) {
    setLast(`Fehler: ${e?.message ?? e}`);
    console.error(e);
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}


.thumb-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(260px, 1fr));
  gap: 14px;
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
