<template>
  <div>
    <!-- Gesamter Header klickbar -->
    <header
      class="accordion-head"
      role="button"
      tabindex="0"
      @click="toggle()"
      @keydown.enter.prevent="toggle()"
      @keydown.space.prevent="toggle()"
    >
      <h2>
        Vergleich &amp; Kennzahlen
        <InfoTooltip
          text="Alle wichtigen Zahlen auf einen Blick: Gesamt-Reward (Σ), Durchschnitt (Ø), wie oft der beste Arm gewählt wurde (Best-Quote), verpasster Gewinn (Regret) und der letzte gemessene Wert. Klicke auf eine Zeile, um die Serie im Chart aus- oder einzublenden."
        />
      </h2>
      <div class="meta">
        <span class="badge">{{ seriesBadge }}</span>
        <button class="btn btn-ghost btn-pill" type="button">
          {{ open ? "Einklappen" : "Einblenden" }}
        </button>
      </div>
    </header>

    <transition name="fade-slide">
      <div v-if="open" class="table-wrap">
        <table class="metrics-table">
          <thead>
            <tr>
              <th>Serie</th>
              <th class="num">Σ&nbsp;Reward</th>
              <th class="num">Ø&nbsp;Reward</th>
              <th class="num">Best-Quote</th>
              <th class="num">Regret</th>
              <th class="num">Zuletzt</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(r, i) in rows"
              :key="(r as any).seriesId ?? r.label ?? i"
              :class="{ off: !isVisible(r, i) }"
              role="button"
              tabindex="0"
              @click="onRowToggle(r, i)"
              @keydown.enter.prevent="onRowToggle(r, i)"
              @keydown.space.prevent="onRowToggle(r, i)"
            >
              <!-- linke Farbleiste + Serien-Pille -->
              <td
                class="series-cell"
                :style="{ borderLeft: `4px solid ${r.color || '#666'}` }"
              >
                <span
                  class="series-chip"
                  :style="{ borderColor: r.color, color: r.color }"
                >
                  {{ r.label }}
                </span>
              </td>

              <!-- Σ Reward -->
              <td class="num">
                {{ fmt(pickNum(r.cumReward, r.totalReward, r.sum)) }}
              </td>

              <!-- Ø Reward -->
              <td class="num">
                {{ fmt(pickNum(r.avgReward, r.meanReward, r.average)) }}
              </td>

              <!-- Best-Quote -->
              <td class="num">
                {{
                  fmtPct(
                    pickNum(
                      r.optimalRate,
                      r.optimalPct,
                      r.optimalPercent,
                      r.optimalShare,
                    ),
                  )
                }}
              </td>

              <!-- Regret -->
              <td class="num">
                {{ fmt(pickNum(r.regret, r.cumRegret, r.totalRegret)) }}
              </td>

              <!-- Zuletzt -->
              <td class="num">
                {{
                  fmt(
                    pickNum(r.lastReward, r.recentReward, r.tailReward, r.last),
                  )
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import InfoTooltip from "./InfoTooltip.vue";

/** Tolerantes Interface – akzeptiert unterschiedliche Feldnamen. */
export interface AnyRow {
  seriesId?: string; // stabile ID (z.B. "manual", "greedy", "epsgreedy#1")
  label?: string;
  color?: string;

  // Zähler
  n?: number;
  count?: number;
  steps?: number;

  // Rewards: Σ / Ø
  cumReward?: number;
  totalReward?: number;
  sum?: number;
  avgReward?: number;
  meanReward?: number;
  average?: number;

  // Optimal-Rate
  optimalRate?: number;
  optimalPct?: number;
  optimalPercent?: number;
  optimalShare?: number;

  // Regret
  regret?: number;
  cumRegret?: number;
  totalRegret?: number;

  // Zuletzt
  lastReward?: number;
  recentReward?: number;
  tailReward?: number;
  last?: number;

  // Typ-Hinweise
  type?: string;
  kind?: string;
}

const props = defineProps<{
  rows: AnyRow[];
  open?: boolean;
  /** Sichtbarkeits-Map je seriesId (true = sichtbar). Wenn nicht vorhanden ⇒ sichtbar. */
  visibleMap?: Record<string, boolean>;
}>();

const emit = defineEmits<{
  (e: "update:open", v: boolean): void;
  (e: "toggleSeries", payload: { seriesId: string; visible: boolean }): void;
}>();

const open = computed({
  get: () => props.open ?? false,
  set: (v: boolean) => emit("update:open", v),
});
function toggle() {
  open.value = !open.value;
}

const seriesBadge = computed(() => `${props.rows?.length ?? 0} Serien`);

/* ---------- Helpers ---------- */
function pickNum(...vals: Array<number | undefined>) {
  for (const v of vals)
    if (typeof v === "number" && Number.isFinite(v)) return v;
  return undefined;
}
function pickInt(...vals: Array<number | undefined>) {
  const v = pickNum(...vals);
  return v == null ? "—" : Math.round(v);
}
function fmt(v?: number) {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(2);
}
function fmtPct(v?: number) {
  if (v == null || !Number.isFinite(v)) return "—";
  const pct = v <= 1 ? v * 100 : v; // akzeptiert 0..1 oder 0..100
  return `${pct.toFixed(1)}%`;
}
function deriveType(r: AnyRow): string {
  const textParts = [r.type, (r as any).kind, r.seriesId, r.label]
    .filter(Boolean)
    .map((v) => v.toString().toLowerCase());

  const hay = textParts.join(" ");
  if (/manual/.test(hay) || /manuell/.test(hay)) return "Manuell";
  if (/custom/.test(hay) || /custom:/.test(hay)) return "Custom";
  if (/(eps|epsilon|\be-?greedy\b)/.test(hay)) return "e-Greedy";
  if (/\bgreedy\b/.test(hay)) return "Greedy";
  if (/\bucb\b/.test(hay)) return "UCB";
  if (/thompson|gaussian|beta/.test(hay)) return "Thompson";
  if (/gradient/.test(hay)) return "Gradient Bandit";
  return "-";
}
function seriesIdOf(r: AnyRow, i: number) {
  return (r.seriesId || r.label || String(i)).toString();
}
function isVisible(r: AnyRow, i: number) {
  const id = seriesIdOf(r, i);
  return props.visibleMap?.[id] ?? true;
}
function onRowToggle(r: AnyRow, i: number) {
  const id = seriesIdOf(r, i);
  const next = !(props.visibleMap?.[id] ?? true);
  emit("toggleSeries", { seriesId: id, visible: next });
}
</script>

<style scoped>
/* Inset-Header – konsistent mit AdvancedSettings */
.accordion-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  background: #171717;
  margin-bottom: 8px;
  cursor: pointer;
}
.meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.badge {
  display: inline-block;
  border: 1px solid #2a2a2a;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
  color: var(--muted);
}
.btn {
  height: 36px;
  padding: 0 12px;
  border: 1px solid #2d2d2d;
  background: #171717;
  color: #eaeaea;
  border-radius: 999px;
  cursor: pointer;
}
.btn-ghost {
  background: #161616;
}
.btn-pill {
  border-radius: 999px;
}

.table-wrap {
  margin-top: 8px;
}

/* Tabelle */
.metrics-table {
  width: 100%;
  table-layout: auto;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid #222;
  border-radius: 10px;
  overflow: hidden;
  background: #131313;
}
thead tr {
  background: #171717;
}
th,
td {
  padding: 10px 12px;
  border-bottom: 1px solid #222;
  vertical-align: middle;
}
th.num,
td.num {
  text-align: right;
}
tbody tr:last-child td {
  border-bottom: none;
}

/* Klickbare Zeilen + linke Farbleiste */
.metrics-table tbody tr {
  outline: none;
}
.metrics-table tbody tr td:first-child {
  /* Farbleiste per Inline-Style gesetzt */
}
.series-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Sichtbarkeit: gedimmt, wenn ausgeblendet */
.metrics-table tbody tr.off {
  opacity: 0.55;
}
.metrics-table tbody tr.off .series-chip {
  filter: grayscale(0.3);
  opacity: 0.8;
}

/* Serien-Pille */
.series-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid #2a2a2a;
  background: #1f1f2b;
  font-size: 12px;
}

/* Animation */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
