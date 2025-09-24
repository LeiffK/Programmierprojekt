<template>
  <section class="card" v-if="snapshot">
    <h2>Status & Debug</h2>

    <div class="badges">
      <span class="badge"
        >Typ: <b>{{ snapshot.config.type }}</b></span
      >
      <span class="badge"
        >Arms: <b>{{ snapshot.config.arms }}</b></span
      >
      <span class="badge"
        >Optimal: <b>{{ snapshot.optimalAction }}</b></span
      >
    </div>

    <div class="out">
      <div class="label">Letzte Antwort / Fehler</div>
      <pre class="pre" v-if="lastResult">{{ lastResult }}</pre>
      <div class="muted" v-else>—</div>
    </div>

    <div style="margin-top: 12px">
      <div class="label">Counts & Schätzungen</div>
      <div
        class="grid"
        style="grid-template-columns: repeat(3, 1fr); gap: 10px"
      >
        <div
          v-for="i in snapshot.config.arms"
          :key="'dbg-' + i"
          class="dbg-cell"
        >
          <div>
            <b>{{ String.fromCharCode(64 + i) }}</b>
          </div>
          <div class="muted">n={{ snapshot.counts[i - 1] || 0 }}</div>
          <div class="muted">q={{ estimateText(i - 1) }}</div>
          <div class="muted small">wahr: {{ truthText(i - 1) }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { iEnvConfig } from "../env/Domain/iEnvConfig.js";

type EnvSnapshot = {
  config: iEnvConfig;
  optimalAction: number;
  counts: number[];
  estimates: number[];
};

const props = defineProps<{
  snapshot: EnvSnapshot | null;
  lastResult: string;
}>();

function estimateText(idx: number) {
  const q = props.snapshot?.estimates[idx] ?? 0;
  return `${q.toFixed(0)}s`; // watchtime. klar.
}
function truthText(idx: number) {
  const cfg = props.snapshot?.config;
  if (!cfg) return "—";
  const mu = cfg.means?.[idx];
  const sd = cfg.stdDev?.[idx];
  return mu != null && sd != null
    ? `${mu.toFixed(0)}s ± ${sd.toFixed(0)}s`
    : "—";
}
</script>

<style scoped>
.dbg-cell {
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 8px 10px;
  background: #1a1a1a;
}
.muted.small {
  font-size: 12px;
}
</style>
