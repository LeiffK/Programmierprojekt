<template>
  <div class="shell">
    <header class="bar">
      <div class="bar-inner">
        <div class="brand" @click="scrollTop" title="Bandit-Studio">
          <!-- YouTube-ähnliches Logo -->
          <svg
            class="yt-logo"
            viewBox="0 0 90 64"
            aria-hidden="true"
            focusable="false"
          >
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
              <path
                d="M12 5V2L7 6l5 4V7a5 5 0 1 1-4.9 6.1 1 1 0 0 0-1.96.4A7 7 0 1 0 12 5z"
                fill="currentColor"
              />
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

          <button
            class="btn btn-ghost btn-pill"
            @click="showTopic = true"
            title="Thema verstehen"
          >
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm0 15a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm1-4.75h-2V7h2v5.25z"
                fill="currentColor"
              />
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
              <path d="M8 5v14l11-7z" fill="currentColor" />
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

          <section id="manual-section" class="card" v-if="mode === 'manual'">
            <h2>Wähle, welches Thumbnail am besten performen wird <InfoTooltip text="Hier testest du manuell: Klicke auf ein Thumbnail und sieh sofort, wie viel Reward es bringt. Gleichzeitig lernen die Algorithmen im Hintergrund mit – so kannst du deine eigene Intuition direkt mit den automatischen Strategien vergleichen." /></h2>

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

          <div id="advanced-settings">
            <AdvancedSettings
              :mode="mode"
              v-model:env="form"
              v-model:policyConfigs="policyConfigs"
              v-model:open="settingsOpen"
            />
          </div>
        </div>

        <div class="col-right">
          <section id="chart-area" class="card">
            <h2>Verläufe <InfoTooltip text="Sieh live, wie sich die Algorithmen entwickeln. Wähle oben eine Metrik aus (z.B. Gesamt-Reward oder Regret) und klicke in der Legende auf Algorithmen, um einzelne Linien ein- oder auszublenden. So erkennst du schnell, welche Strategie am besten funktioniert." /></h2>
            <ChartArea
              :key="chartKey"
              :series="chartSeries"
              :env-type="form.type"
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
    <ResetDialog
      :open="showReset"
      @close="closeResetModal"
      @confirm="confirmReset"
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
import InfoTooltip from "./components/InfoTooltip.vue";
import ResetDialog from "./components/ResetDialog.vue";

/* Content */
import { topicHtml } from "./content/topicContent";

/* Styles */
import "./App.css";

/* Composables */
import { useTutorialHooks } from "./composables/useTutorialHooks";
import { useSeriesManagement } from "./composables/useSeriesManagement";

/* Domain */
import type { ManualStep } from "./domain/iHistory";
import type { iMetricsRow } from "./domain/iMetrics";
import type { iChartSeries } from "./domain/chart/iChartSeries";
import type { ChartMetric } from "./domain/chart/iChartMetric";
import type { iEnvConfig } from "./env/Domain/iEnvConfig";
import type { iBanditEnv } from "./env/Domain/iBanditEnv";
import { GaussianBanditEnv } from "./env/GaussianBanditEnv";
import { BernoulliBanditEnv } from "./env/BernoulliBanditEnv";
import type { iCustomPolicyRegistration } from "./algorithms/Domain/iCustomPolicyRegistration";
import {
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
const form = ref<iEnvConfig>({
  type: "gaussian",
  arms: 3,
  seed: Math.floor(Math.random() * 1_000_000)
});
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

function openResetModal() {
  showReset.value = true;
}
function closeResetModal() {
  showReset.value = false;
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
const runnerEnvConfigs = ref<Record<string, iEnvConfig>>({});
function initManualEnv() {
  const baseConfig: iEnvConfig = { ...form.value };
  manualEnv.value =
    baseConfig.type === "bernoulli"
      ? new BernoulliBanditEnv({ ...baseConfig })
      : new GaussianBanditEnv({ ...baseConfig });
  manualHistory.value = [];
  manualCounts.value = Array.from({ length: form.value.arms ?? 0 }, () => 0);
}

function refreshRunnerEnvConfigs() {
  const next: Record<string, iEnvConfig> = {};
  for (const item of algorithmsRunner.getAll()) {
    next[item.id] = { ...item.env.config };
  }
  runnerEnvConfigs.value = next;
}

/* Policies-Konfiguration (UI-Einstellung) - andere Algos kommen aus AdvancedSettings */
const policyConfigs = ref<any>({
  greedy: {
    optimisticInitialValue: 100,
    variants: [{ optimisticInitialValue: 100 }],
  },
  epsgreedy: {
    epsilon: 0.1,
    optimisticInitialValue: 150,
    variants: [{ epsilon: 0.1, optimisticInitialValue: 150 }],
  },
  // UCB / Thompson / Gradient werden in AdvancedSettings befüllt (inkl. variants)
  customPolicies: [] as iCustomPolicyRegistration[],
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
    const greedyVariantsSrc =
      Array.isArray(greedy.variants) && greedy.variants.length
        ? greedy.variants
        : [{ optimisticInitialValue: greedy.optimisticInitialValue }];
    greedy.variants = greedyVariantsSrc.map((v: any) => ({
      ...v,
      optimisticInitialValue: clamp01(v.optimisticInitialValue),
    }));
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
    const greedyVariantsSrc =
      Array.isArray(greedy.variants) && greedy.variants.length
        ? greedy.variants
        : [{ optimisticInitialValue: greedy.optimisticInitialValue }];
    greedy.variants = greedyVariantsSrc.map((v: any) => ({
      ...v,
      optimisticInitialValue: ensureHigh(
        v.optimisticInitialValue,
        greedy.optimisticInitialValue,
      ),
    }));
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
const {
  seriesState,
  activeAlgoSeries,
  algoHistory,
  reconcileActiveSeries,
  isManualSeriesLike,
  purgeManualSeriesHard,
  resetPalette,
  handleRunnerResult,
} = useSeriesManagement({
  policyConfigs,
  form,
  manualHistory,
  manualCounts,
});

/* Runner-Events */
const offRunner = algorithmsRunner.on((msg: any) => {
  if (msg.type === "CONFIGURED") {
    refreshRunnerEnvConfigs();
    reconcileActiveSeries();
    lastEventText.value = "Konfiguriert.";
  }
  if (msg.type === "STARTED")
    lastEventText.value = "Automatischer Lauf gestartet.";
  if (msg.type === "PAUSED") lastEventText.value = "Pausiert.";
  if (msg.type === "STOPPED")
    lastEventText.value = `Gestoppt: ${msg.payload?.reason ?? "—"}`;

  if (msg.type === "RESULT") {
    handleRunnerResult(
      msg.payload.policyId,
      msg.payload.action,
      msg.payload.reward,
      msg.payload.isOptimal,
    );
  }
});

function configureAlgoRunner() {
  algorithmsRunner.configure({
    envConfig: form.value,
    totalSteps: 0,
    rate: 1,
    policyConfigs: policyConfigs.value,
  });
  refreshRunnerEnvConfigs();
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
  resetPalette();
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
  const looksJson = /^\s*{[\s\S]*}\s*$/.test(String(msg));
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
      manualEnv.value?.config ?? form.value,
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
      runnerEnvConfigs.value[s.id] ?? form.value,
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
      manualEnv.value?.config ?? form.value,
      (seriesState as any).manual,
    );
    if (!isManualSeriesLike(s) || mode.value === "manual") out.push(s);
  }
  for (const s of activeAlgoSeries.value) {
    const built = buildSeriesFromManual(
      algoHistory.value[s.id] ?? [],
      runnerEnvConfigs.value[s.id] ?? form.value,
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

const showTutorial = ref(false);
function startTutorial() {
  showTutorial.value = true;
}

const tutorialHooks = useTutorialHooks({
  mode,
  onModeChange,
  onRunnerReset,
  form,
  settingsOpen,
  tableOpen,
  onManual,
  chartMetric,
});
</script>
