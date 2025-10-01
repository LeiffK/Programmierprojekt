<template>
  <section class="card">
    <!-- Header mit Toggle -->
    <div
      class="header"
      @click="toggle()"
      role="button"
      tabindex="0"
      @keydown.enter.prevent="toggle()"
      @keydown.space.prevent="toggle()"
    >
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
            <div class="tr head" role="row">
              <!-- keine separate Sichtbar-Spalte mehr -->
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
            <div
              v-for="r in rows"
              :key="r.seriesId"
              class="tr"
              :class="{ active: r.visible }"
              :style="{ '--row-accent': r.color || '#ff0000' }"
              role="row"
              tabindex="0"
              @click="onRowClick(r)"
              @keydown.enter.prevent="onRowClick(r)"
              @keydown.space.prevent="onRowClick(r)"
            >
              <div class="td col-series" role="cell">
                <span class="dot" :style="dotStyle(r)" />
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
          Fußnote, falls wir hier noch was tolles hinschreiben wollen
        </p>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { iMetricsRow } from "../domain/iMetrics";

// Props & v-model:open
const props = defineProps<{
  rows: iMetricsRow[];
  open?: boolean;
}>();
const emit = defineEmits<{
  (e: "update:open", v: boolean): void;
  (e: "toggleSeries", payload: { seriesId: string; visible: boolean }): void;
}>();

// interne Open/Close-Logik
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

// gesamte Zeile toggelt Sichtbarkeit (UI-only, Parent macht den eigentlichen Switch)
function onRowClick(r: iMetricsRow) {
  emit("toggleSeries", { seriesId: r.seriesId, visible: !r.visible });
}

// farbiger Punkt – leicht abgedunkelt wenn unsichtbar
function dotStyle(r: iMetricsRow) {
  return {
    background: r.color || "#888",
    opacity: r.visible ? 1 : 0.4,
  };
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
  transition: transform var(--dur-quick, var(--dur-soft))
    var(--ease-quick, var(--ease-soft));
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
.tr {
  display: grid;
  grid-template-columns: 1.2fr 0.9fr 0.5fr 0.8fr 0.8fr 0.9fr 0.8fr 1.2fr;
  cursor: pointer;
  transition:
    background 160ms var(--ease-quick),
    box-shadow 160ms var(--ease-quick),
    filter 160ms var(--ease-quick);
}
.head {
  cursor: default;
}
.thead .tr {
  background: #151515;
  border-bottom: 1px solid var(--line);
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

/* aktive Zeile bekommt linken Farbstreifen + leichten Lift */
.tr.active {
  background: #191919;
  box-shadow: inset 4px 0 0 var(--row-accent, #ff0000);
  filter: saturate(1.05);
}

.col-series {
  display: flex;
  align-items: center;
  gap: 8px;
}
.col-type {
  white-space: nowrap;
}

/* Punkt in Serien-Spalte */
.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #999;
  display: inline-block;
}

/* Typ-Badge */
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

.footnote {
  margin-top: 8px;
}

/* weich ein-/ausblenden */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition:
    opacity var(--dur-soft, 0.22s)
      var(--ease-soft, cubic-bezier(0.22, 0.61, 0.36, 1)),
    transform var(--dur-soft, 0.22s)
      var(--ease-soft, cubic-bezier(0.22, 0.61, 0.36, 1));
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
