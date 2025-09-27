<template>
  <div class="shell">
    <header class="bar">
      <div class="bar-inner">
        <div class="brand">Creator Lab · Mini Runner</div>
        <ModeSwitch v-model="mode" @change="onModeChange" />
      </div>
    </header>

    <main class="wrap">
      <!-- Setup & Debug bleiben immer sichtbar -->
      <EnvSetup v-model="form" :busy="busy" @inited="onInited" @log="setLast" />
      <DebugPanel :snapshot="snapshot" :lastResult="lastResult" />

      <!-- Manuell testen -->
      <section class="card" v-if="mode === 'manual'">
        <h2>Manuell testen</h2>
        <p class="muted">
          Ein Klick entspricht genau einem Zuschauer. Handarbeit ftw.
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

      <!-- Algorithmus / Worker -->
      <RunnerControls
        v-if="mode === 'algo'"
        :envId="envId || null"
        :arms="snapshot?.config?.arms || form.arms"
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

type EnvSnapshot = {
  config: iEnvConfig;
  optimalAction: number;
  counts: number[];
  estimates: number[];
};

const form = ref<iEnvConfig>({ type: "gaussian", arms: 6, seed: 12345 });
const envId = ref<string>("");
const busy = ref(false);

const snapshot = ref<EnvSnapshot | null>(null);
const lastResult = ref<string>("");
const lastEventText = ref<string>("—");

// Neuer Modus-State
const mode = ref<"manual" | "algo">("manual");

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

/* bestehende Grids/Styles bleiben wie gehabt */
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
