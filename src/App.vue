<template>
  <div class="shell">
    <header class="bar">
      <div class="bar-inner">
        <div class="brand" @click="scrollTop" title="Bandit-Studio">
          <!-- YouTube-ähnliches Logo -->
          <svg class="yt-logo" viewBox="0 0 90 64" aria-hidden="true" focusable="false">
            <rect x="0" y="0" width="90" height="64" rx="12" ry="12"></rect>
            <polygon points="36,16 36,48 64,32"></polygon>
          </svg>
          <span>Bandit-Studio</span>
        </div>
        <div class="bar-actions">
          <!-- Reset-Button: öffnet In-App-Dialog -->
          <button
              class="btn btn-ghost btn-pill"
              type="button"
              @click="openResetModal"
              title="Alle Einstellungen & Daten zurücksetzen"
              aria-label="Alle Einstellungen und lokal gespeicherten Daten zurücksetzen"
              ref="resetBtnRef"
          >
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-4.9 6.1 1 1 0 0 0-1.96.4A7 7 0 1 0 12 5z" fill="currentColor"/>
            </svg>
            Zurücksetzen
          </button>

          <!-- Debug-Schalter -->
          <button
              class="btn btn-pill"
              :class="debugEnabled ? 'btn-primary' : 'btn-ghost'"
              type="button"
              :aria-pressed="debugEnabled ? 'true' : 'false'"
              @click="toggleDebug"
              title="Debug-Modus ein/aus"
          >
            {{ debugEnabled ? "Debug: an" : "Debug: aus" }}
          </button>

          <button class="btn btn-ghost btn-pill" @click="showTopic = true" title="Thema verstehen">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm0 15a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm1-4.75h-2V7h2v5.25z" fill="currentColor"/>
            </svg>
            Thema verstehen
          </button>

          <button
              id="btn-tutorial"
              class="btn btn-primary btn-pill"
              @click="startTutorial"
              title="Anwendung verstehen"
          >
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" fill="currentColor"/>
            </svg>
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
                <ModeSwitch
                    id="mode-switch"
                    v-model="mode"
                    @change="onModeChange"
                />
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
                  :debug="debugEnabled"
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
            <DebugPanel v-if="debugEnabled" />
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

    <!-- In-App Reset-Dialog -->
    <div
        v-if="showReset"
        class="modal-backdrop"
        @click.self="closeResetModal"
        @keydown.esc.prevent.stop="closeResetModal"
    >
      <div
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-title"
          aria-describedby="reset-desc"
          tabindex="-1"
          ref="modalRef"
      >
        <div class="modal-header">
          <div class="modal-title" id="reset-title">
            Zurücksetzen bestätigen
          </div>
        </div>
        <div class="modal-body" id="reset-desc">
          <p>
            Alle Daten und Einstellungen gehen verloren. Dieser Schritt kann nicht
            rückgängig gemacht werden.
          </p>
        </div>
        <div class="modal-footer">
          <button
              class="btn btn-ghost btn-pill"
              type="button"
              @click="closeResetModal"
              ref="cancelBtnRef"
          >
            Abbrechen
          </button>
          <button
              class="btn btn-danger btn-pill"
              type="button"
              @click="confirmReset"
              ref="confirmBtnRef"
          >
            Jetzt zurücksetzen
          </button>
        </div>
      </div>
    </div>
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
import type { iBanditEnv } from "./env/Domain/iBanditEnv";
import { GaussianBanditEnv } from "./env/GaussianBanditEnv";
import { BernoulliBanditEnv } from "./env/BernoulliBanditEnv";
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

/* Debug-Modus (persistiert) – Branding-Migration: banditlab -> banditstudio */
const debugEnabled = ref<boolean>(false);
try {
  const rawNew = localStorage.getItem("banditstudio.debug");
  const rawOld = localStorage.getItem("banditlab.debug");
  const src = rawNew ?? rawOld;
  debugEnabled.value = src ? JSON.parse(src) === true : false;
} catch {
  debugEnabled.value = false;
}
watch(
    () => debugEnabled.value,
    (v) => {
      try {
        localStorage.setItem("banditstudio.debug", JSON.stringify(!!v));
      } catch {}
    },
    { immediate: true },
);
function toggleDebug() {
  debugEnabled.value = !debugEnabled.value;
}

/* In-App-Reset-Dialog State */
const showReset = ref(false);
const resetBtnRef = ref<HTMLButtonElement | null>(null);
const modalRef = ref<HTMLDivElement | null>(null);
const cancelBtnRef = ref<HTMLButtonElement | null>(null);
const confirmBtnRef = ref<HTMLButtonElement | null>(null);

function openResetModal() {
  showReset.value = true;
  nextTick(() => {
    // Fokus in den Dialog legen
    confirmBtnRef.value?.focus?.();
  });
}
function closeResetModal() {
  showReset.value = false;
  // Fokus zurück auf Auslöser
  nextTick(() => resetBtnRef.value?.focus?.());
}
async function confirmReset() {
  await doFullReset();
}

/* Vollständiger Reset (ohne native confirm) */
async function doFullReset() {
  try {
    window.dispatchEvent(new CustomEvent("bandit:reset:before"));
  } catch {}

  try {
    localStorage.clear();
  } catch {}
  try {
    sessionStorage.clear();
  } catch {}

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {}

  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {}

  try {
    resetSeriesStore();
  } catch {}

  try {
    window.dispatchEvent(new CustomEvent("bandit:reset:after"));
  } catch {}

  window.location.reload();
}

/* Manuelles Env */
const manualEnv = ref<iBanditEnv | null>(null);
const manualHistory = ref<ManualStep[]>([]);
const manualCounts = ref<number[]>([]);
function initManualEnv() {
  const baseConfig: iEnvConfig = { ...form.value };
  manualEnv.value =
      baseConfig.type === "bernoulli"
          ? new BernoulliBanditEnv({ ...baseConfig })
          : new GaussianBanditEnv({ ...baseConfig });
  manualHistory.value = [];
  manualCounts.value = Array.from({ length: form.value.arms ?? 0 }, () => 0);
}

/* Policies-Konfiguration (UI-Einstellung) — andere Algos kommen aus AdvancedSettings */
const policyConfigs = ref<any>({
  greedy: { optimisticInitialValue: 100 },
  epsgreedy: {
    epsilon: 0.1,
    optimisticInitialValue: 150,
    variants: [{ epsilon: 0.1, optimisticInitialValue: 150 }],
  },
  // UCB / Thompson / Gradient werden in AdvancedSettings befüllt (inkl. variants)
  customPolicies: [] as CustomPolicyRegistration[],
});

/* Defaults je Env justieren (Greedy/ε-Greedy) */
function adjustPolicyDefaultsForEnv(type: iEnvConfig["type"]) {
  const current = policyConfigs.value ?? {};
  const greedy = { ...(current.greedy ?? {}) };
  const eps = { ...(current.epsgreedy ?? {}) };

  if (type === "bernoulli") {
    const clamp01 = (val?: number) => {
      if (val == null) return 1;
      if (val < 0) return 0;
      if (val > 1) return 1;
      return val;
    };
    greedy.optimisticInitialValue = clamp01(greedy.optimisticInitialValue);
    const baseOiv = clamp01(eps.optimisticInitialValue);
    eps.optimisticInitialValue = baseOiv;
    const sourceVariants =
        Array.isArray(eps.variants) && eps.variants.length
            ? eps.variants
            : [{ epsilon: eps.epsilon ?? 0.1, optimisticInitialValue: baseOiv }];
    eps.variants = sourceVariants.map((v: any) => ({
      ...v,
      optimisticInitialValue: clamp01(v.optimisticInitialValue),
    }));
  } else {
    const ensureHigh = (val?: number, fallback = 100) => {
      if (val == null) return fallback;
      return val > 1 ? val : fallback;
    };
    greedy.optimisticInitialValue = ensureHigh(
        greedy.optimisticInitialValue,
        100,
    );
    const baseOiv = ensureHigh(eps.optimisticInitialValue, 150);
    eps.optimisticInitialValue = baseOiv;
    const sourceVariants =
        Array.isArray(eps.variants) && eps.variants.length
            ? eps.variants
            : [{ epsilon: eps.epsilon ?? 0.1, optimisticInitialValue: baseOiv }];
    eps.variants = sourceVariants.map((v: any) => ({
      ...v,
      optimisticInitialValue: ensureHigh(v.optimisticInitialValue, baseOiv),
    }));
  }

  policyConfigs.value = {
    ...current,
    greedy: { ...current.greedy, ...greedy },
    epsgreedy: { ...current.epsgreedy, ...eps },
  };
}

const lastPolicyEnvType = ref<iEnvConfig["type"] | null>(null);
watch(
    () => form.value.type,
    (type) => {
      if (!type || lastPolicyEnvType.value === type) return;
      lastPolicyEnvType.value = type;
      adjustPolicyDefaultsForEnv(type);
    },
    { immediate: true },
);

/* Schätzungen & „Wahr“-Infos (nur im UI genutzt) */
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
  if (!c) return "-";
  const estimate = manualEstimates.value[idx];
  return form.value.type === "bernoulli"
      ? `${(estimate * 100).toFixed(1)}%`
      : `${estimate.toFixed(0)}s`;
}
function truthText(idx: number) {
  const cfg = manualEnv.value?.config;
  if (!cfg) return "-";
  if (cfg.type === "bernoulli") {
    const p = cfg.probs?.[idx];
    return p != null ? `${(p * 100).toFixed(1)}%` : "-";
  }
  const mu = cfg.means?.[idx];
  const sd = cfg.stdDev?.[idx] ?? (cfg as any)?.sigma?.[idx];
  return mu != null && sd != null
      ? `${(+mu).toFixed(0)}s ~ ${Math.max(+sd, 0).toFixed(0)}s`
      : "-";
}

/* Serien-Store + Algo-Serien */
const seriesState = getSeriesState();
type ActiveSeries = { id: string; label: string; color: string };
const activeAlgoSeries = ref<ActiveSeries[]>([]);
const algoHistory = ref<Record<string, ManualStep[]>>({});

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

/* Runner-first: IDs aus dem tatsächlich konfigurierten Runner ableiten */
function expectedAlgoIds(): string[] {
  try {
    const live = algorithmsRunner.getAll?.() ?? [];
    if (Array.isArray(live) && live.length) {
      return live.map((it: any) => String(it.id)).filter(Boolean);
    }
  } catch {}
  // Fallback (nur falls Runner noch nicht bereit ist)
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

function labelFromRunner(id: string): string | undefined {
  try {
    const all = algorithmsRunner.getAll?.() ?? [];
    const hit = all.find((x: any) => String(x.id) === id);
    return hit?.label;
  } catch {}
  return undefined;
}

function prettyLabelFromId(id: string) {
  const live = labelFromRunner(id);
  if (live) return live;

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

    // Selbstheilung: unbekannte Serien sofort registrieren
    if (!activeAlgoSeries.value.some((s) => s.id === id)) {
      const color = (seriesState as any)[id]?.color ?? nextColor();
      const label = prettyLabelFromId(id);
      ensureSeries(id, label, color);
      activeAlgoSeries.value = [
        ...activeAlgoSeries.value,
        { id, label, color },
      ];
      setSeriesLabelLocal(id, label);
    }

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
  if (debugEnabled.value && payload?.optimalAction != null) {
    lastEventText.value = `Init – optimaler Arm: ${payload.optimalAction}`;
  } else {
    lastEventText.value = "Initialisiert";
  }
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
    const rewardText =
        manualEnv.value.config.type === "bernoulli"
            ? res.reward.toFixed(0)
            : `${res.reward.toFixed(2)}s`;
    const suffix = debugEnabled.value && res.isOptimal ? " - optimal" : "";
    lastEventText.value = `Manuell: Arm ${a + 1} - Reward ${rewardText}${suffix}`;
  } finally {
    busy.value = false;
  }
}
function onEnvLog(msg: string) {
  const looksJson = /^\s*\{[\s\S]*\}\s*$/.test(String(msg));
  if (looksJson && !debugEnabled.value) return;
  lastEventText.value = String(msg);
}

/* KPIs */
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

/* Branding-Helfer */
function scrollTop() {
  try {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch {
    window.scrollTo(0, 0);
  }
}

/* Lifecycle */
onMounted(() => {
  try {
    if (typeof document !== "undefined") document.title = "Bandit-Studio";
  } catch {}

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
      chartKey.value++; // Refresh forcieren
    },
    { deep: true },
);

/* ---------------- Info/Overlays ---------------- */
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
    <li><b>UCB</b>: optimistische Schranken für wohldosierte Exploration</li>
    <li><b>Thompson</b>: probabilistische Auswahl nach Posterior</li>
    <li><b>Gradient</b>: Präferenzlernen via Softmax</li>
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
  resetBaseline: async () => {
    if (mode.value !== "manual") {
      mode.value = "manual";
      onModeChange();
      await nextTick();
    }
    try {
      algorithmsRunner.stop("tutorial-baseline");
    } catch {}
    onRunnerReset?.();
    form.value.arms = 3;
    settingsOpen.value = false;
    tableOpen.value = false;
    await nextTick();
  },
  restoreBaseline: async () => {
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
  incArms: () => {
    form.value.arms = Math.max(1, (form.value.arms ?? 1) + 1);
  },
  decArms: () => {
    form.value.arms = Math.max(1, (form.value.arms ?? 1) - 1);
  },
  openAdvanced: () => {
    settingsOpen.value = true;
  },
  closeAdvanced: () => {
    settingsOpen.value = false;
  },
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
  manualClick: async (i: number) => {
    await onManual(i);
  },
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
  setMetric: async (m: string) => {
    chartMetric.value = m as any;
    await nextTick();
  },
  toggleSeries: async (id: string, v: boolean) => {
    setSeriesVisible(id, v);
    await nextTick();
  },
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
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.yt-logo {
  width: 28px;
  height: 20px;
  display: inline-block;
}
.yt-logo rect {
  fill: #ff0000; /* YouTube-Primärrot */
}
.yt-logo polygon {
  fill: #ffffff;
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
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.btn .icon {
  width: 16px;
  height: 16px;
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
.btn-danger {
  background: #7a1f1f;
  border-color: #9b2b2b;
}
.btn-danger:hover {
  background: #8b2525;
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

/* Modal (In-App) */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 15, 15, 0.7);
  backdrop-filter: blur(2px);
  display: grid;
  place-items: center;
  z-index: 1000;
  padding: 16px;
}
.modal {
  width: 100%;
  max-width: 520px;
  background: #141414;
  border: 1px solid #242424;
  border-radius: 12px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
  outline: none;
}
.modal-header {
  padding: 14px 16px 6px 16px;
  border-bottom: 1px solid #1f1f1f;
}
.modal-title {
  font-size: 16px;
  font-weight: 700;
}
.modal-body {
  padding: 16px;
  color: #e5e7eb;
}
.modal-footer {
  padding: 12px 16px 16px 16px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid #1f1f1f;
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