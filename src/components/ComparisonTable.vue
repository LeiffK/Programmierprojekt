<template>
  <section class="card">
    <div class="header" @click="toggle()">
      <div class="title">
        <span class="chev" :class="{ open }">▸</span>
        <h2>Vergleich & Kennzahlen</h2>
      </div>
      <div class="hint muted">{{ open ? "Einklappen" : "Ausklappen" }}</div>
    </div>

    <transition name="fade-slide">
      <div v-if="open" class="body">
        <div class="table" role="table" aria-label="Vergleichstabelle">
          <div class="thead" role="rowgroup">
            <div class="tr" role="row">
              <div
                class="th col-choose"
                role="columnheader"
                title="In Diagramm ein-/ausblenden"
              >
                Sichtbar
              </div>
              <div class="th col-series" role="columnheader">Serie</div>
              <div class="th col-type" role="columnheader">Typ</div>
              <div class="th" role="columnheader" title="Anzahl Züge">n</div>
              <div class="th" role="columnheader" title="Kumulierte Belohnung">
                Σ Reward
              </div>
              <div class="th" role="columnheader" title="Durchschnitts-Reward">
                Ø Reward
              </div>
              <div
                class="th"
                role="columnheader"
                title="Optimale Wahl in Prozent"
              >
                Best-Quote
              </div>
              <div
                class="th"
                role="columnheader"
                title="Verpasster Erwartungswert (je kleiner desto besser)"
              >
                Regret
              </div>
              <div
                class="th col-last"
                role="columnheader"
                title="Letzter Zug (Debug)"
              >
                Zuletzt
              </div>
            </div>
          </div>

          <div class="tbody" role="rowgroup">
            <div v-for="r in rows" :key="r.seriesId" class="tr" role="row">
              <div class="td col-choose" role="cell">
                <label class="check">
                  <input
                    type="checkbox"
                    :checked="r.visible"
                    @change="onToggle(r)"
                  />
                  <span></span>
                </label>
              </div>

              <div class="td col-series" role="cell">
                <span class="dot" :style="dotStyle(r)"></span>
                {{ r.label }}
              </div>

              <div class="td col-type" role="cell">
                <span class="pill" :class="r.kind">{{
                  r.kind === "manual" ? "Manuell" : "Algorithmus"
                }}</span>
              </div>

              <div class="td" role="cell">{{ r.n }}</div>
              <div class="td" role="cell">{{ fmtNum(r.cumReward) }}</div>
              <div class="td" role="cell">{{ fmtNum(r.avgReward) }}</div>
              <div class="td" role="cell">
                {{ (r.bestChoiceRate * 100).toFixed(1) }}%
              </div>
              <div class="td" role="cell">{{ fmtNum(r.regret) }}</div>
              <div class="td col-last" role="cell">
                <span class="muted" v-if="r.lastAction == null">—</span>
                <span v-else
                  >Arm {{ String.fromCharCode(65 + r.lastAction) }} ·
                  {{ fmtNum(r.lastReward ?? 0) }}</span
                >
              </div>
            </div>
          </div>
        </div>

        <p class="footnote muted">
          * Regret = Summe( bester erwarteter Reward − beobachteter Reward ).
          Klingt traurig, ist aber ein guter KPI.
        </p>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
// Falls dein Projekt KEIN '@' Alias hat: auf "../domain/iMetrics" ändern
import type { iMetricsRow } from "@/domain/iMetrics";

const props = defineProps<{ rows: iMetricsRow[]; open?: boolean }>();
const emit = defineEmits<{
  (e: "update:open", v: boolean): void;
  (e: "toggleSeries", payload: { seriesId: string; visible: boolean }): void;
}>();

const inner = ref<boolean>(props.open ?? true);
watch(
  () => props.open,
  (v) => {
    if (typeof v === "boolean") inner.value = v;
  },
);

const open = computed(() => inner.value);
function toggle() {
  inner.value = !inner.value;
  emit("update:open", inner.value);
}

function onToggle(r: iMetricsRow) {
  emit("toggleSeries", { seriesId: r.seriesId, visible: !r.visible });
}

// kleine Farblogik für den Punkt links vom Seriennamen
function dotStyle(r: iMetricsRow) {
  // Farbe optional an der Row (kannst du im Parent setzen), sonst fallback
  const color =
    (r as unknown as { color?: string })?.color ||
    (r.kind === "manual" ? "#4caf50" : "#ff5252");
  return {
    backgroundColor: color,
    opacity: r.visible ? 1 : 0.35,
  } as Record<string, string | number>;
}

function fmtNum(n: number) {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n * 10) / 10;
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  cursor: pointer;
}
.title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.chev {
  display: inline-block;
  transform: rotate(0deg);
  transition: transform 200ms var(--ease-quick);
}
.chev.open {
  transform: rotate(90deg);
}

.body {
  margin-top: 6px;
}

.table {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
}
.thead .tr {
  background: #151515;
  border-bottom: 1px solid var(--line);
}
.tr {
  display: grid;
  grid-template-columns: 84px 1.2fr 0.9fr 0.5fr 0.8fr 0.8fr 0.9fr 0.8fr 1.2fr;
}
.th,
.td {
  padding: 10px 12px;
}
.td {
  border-top: 1px solid #202020;
}
.tbody .tr:hover {
  background: #161616;
}

.col-choose {
  text-align: center;
}
.col-series {
  display: flex;
  align-items: center;
  gap: 8px;
}
.col-type {
  white-space: nowrap;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #999;
  display: inline-block;
}

.pill {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--line);
}
.pill.manual {
  background: #1c2a1c;
  border-color: #2f5b2f;
  color: #bfe9bf;
}
.pill.algo {
  background: #1f1f2b;
  border-color: #494970;
  color: #cfd1ff;
}

.check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.check input {
  appearance: none;
  width: 18px;
  height: 18px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: #111;
  position: relative;
  cursor: pointer;
}
.check input:checked {
  background: #ff0000;
  border-color: #ff0000;
}
.check input:checked::after {
  content: "";
  position: absolute;
  inset: 3px;
  background: white;
  border-radius: 2px;
}

.footnote {
  margin-top: 8px;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition:
    opacity var(--dur-soft) var(--ease-soft),
    transform var(--dur-soft) var(--ease-soft);
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
