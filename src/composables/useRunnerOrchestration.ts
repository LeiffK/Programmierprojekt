import {
  computed,
  onBeforeUnmount,
  ref,
  watch,
  type Ref,
} from "vue";
import type { ManualStep } from "../domain/iHistory";
import type { iEnvConfig } from "../env/Domain/iEnvConfig";
import type { iBanditEnv } from "../env/Domain/iBanditEnv";
import type { iMetricsRow } from "../domain/iMetrics";
import type { iChartSeries } from "../domain/chart/iChartSeries";
import type { ChartMetric } from "../domain/chart/iChartMetric";
import {
  buildMetricsRowFromManual,
  buildSeriesFromManual,
} from "../services/metrics";
import { algorithmsRunner } from "../services/algorithmsRunner";
import {
  ensureSeries,
  resetSeriesStore,
  setSeriesVisible,
} from "../services/seriesStore";
import { useSeriesManagement } from "./useSeriesManagement";

interface RunnerOrchestrationOptions {
  form: Ref<iEnvConfig>;
  mode: Ref<"manual" | "algo">;
  policyConfigs: Ref<any>;
  manualEnv: Ref<iBanditEnv | null>;
  manualHistory: Ref<ManualStep[]>;
  manualCounts: Ref<number[]>;
  lastEventText: Ref<string>;
  debugEnabled: Ref<boolean>;
  initManualEnv: () => void;
}

function calcOptimalRateFrom(history: ManualStep[] | undefined) {
  if (!history || !history.length) return undefined;
  let optimal = 0;
  for (const entry of history) if (entry.isOptimal) optimal += 1;
  return optimal / history.length;
}

export function useRunnerOrchestration(options: RunnerOrchestrationOptions) {
  const runnerEnvConfigs = ref<Record<string, iEnvConfig>>({});
  const chartMetric = ref<ChartMetric>("cumReward");
  const chartKey = ref(0);

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
    policyConfigs: options.policyConfigs,
    form: options.form,
    manualHistory: options.manualHistory,
    manualCounts: options.manualCounts,
  });

  function refreshRunnerEnvConfigs() {
    const next: Record<string, iEnvConfig> = {};
    for (const item of algorithmsRunner.getAll()) {
      next[item.id] = { ...item.env.config };
    }
    runnerEnvConfigs.value = next;
  }

  function configureAlgoRunner() {
    algorithmsRunner.configure({
      envConfig: options.form.value,
      totalSteps: 0,
      rate: 1,
      policyConfigs: options.policyConfigs.value,
    });
    refreshRunnerEnvConfigs();
  }

  const visibleMap = computed<Record<string, boolean>>(() => {
    const output: Record<string, boolean> = {};
    const state = seriesState as any;
    if (options.mode.value === "manual" && state.manual) {
      output["manual"] = state.manual.visible ?? true;
    }
    for (const entry of activeAlgoSeries.value) {
      output[entry.id] = state[entry.id]?.visible ?? true;
    }
    return output;
  });

  const metricRows = computed<(iMetricsRow & { seriesId?: string; optimalRate?: number })[]>(() => {
    const rows: Array<iMetricsRow & { seriesId?: string; optimalRate?: number }> = [];
    if (options.mode.value === "manual" && (seriesState as any).manual) {
      const manualRow = buildMetricsRowFromManual(
        options.manualHistory.value,
        options.manualEnv.value?.config ?? options.form.value,
        (seriesState as any).manual,
      );
      rows.push({
        ...(manualRow as iMetricsRow),
        seriesId: "manual",
        optimalRate: calcOptimalRateFrom(options.manualHistory.value),
      });
    }
    for (const series of activeAlgoSeries.value) {
      const history = algoHistory.value[series.id] ?? [];
      const row = buildMetricsRowFromManual(
        history,
        runnerEnvConfigs.value[series.id] ?? options.form.value,
        (seriesState as any)[series.id],
      );
      rows.push({
        ...(row as iMetricsRow),
        seriesId: series.id,
        optimalRate: calcOptimalRateFrom(history),
      });
    }
    if (options.mode.value === "algo") {
      return rows.filter((row) => row.seriesId !== "manual");
    }
    return rows;
  });

  const chartSeries = computed<iChartSeries[]>(() => {
    const output: iChartSeries[] = [];
    if (options.mode.value === "manual" && (seriesState as any).manual) {
      const series = buildSeriesFromManual(
        options.manualHistory.value,
        options.manualEnv.value?.config ?? options.form.value,
        (seriesState as any).manual,
      );
      if (!isManualSeriesLike(series) || options.mode.value === "manual") {
        output.push(series);
      }
    }
    for (const entry of activeAlgoSeries.value) {
      const built = buildSeriesFromManual(
        algoHistory.value[entry.id] ?? [],
        runnerEnvConfigs.value[entry.id] ?? options.form.value,
        (seriesState as any)[entry.id],
      );
      if (options.mode.value === "algo" && isManualSeriesLike(built)) continue;
      output.push(built);
    }
    if (options.mode.value === "algo") {
      return output.filter((series) => !isManualSeriesLike(series));
    }
    return output;
  });

  function onToggleSeries(payload: { seriesId: string; visible: boolean }) {
    setSeriesVisible(payload.seriesId, payload.visible);
  }

  function onChartToggle(payload: { id: string; visible: boolean }) {
    setSeriesVisible(payload.id, payload.visible);
  }

type ResetReason = "mode-switch" | "user-reset" | "env-reinit" | "bootstrap";

function hardResetForMode(newMode: "manual" | "algo", reason: ResetReason = "bootstrap") {
  try {
    const status = algorithmsRunner.getStatus?.();
    const shouldStop = status === "RUNNING" || status === "PAUSED";
    if (shouldStop) {
      const message =
        reason === "mode-switch"
          ? "Modus gewechselt"
          : reason === "user-reset"
            ? "Zurückgesetzt"
            : reason === "env-reinit"
              ? "Neu initialisiert"
              : "Neu geladen";
      algorithmsRunner.stop(message);
    }
  } catch {}
  resetSeriesStore();
    options.manualHistory.value = [];
    options.manualCounts.value = Array.from(
      { length: options.form.value.arms ?? 0 },
      () => 0,
    );
    algoHistory.value = {};
    activeAlgoSeries.value = [];
    resetPalette();
    try {
      if ((seriesState as any).manual) delete (seriesState as any).manual;
      Object.keys(seriesState as any).forEach((key) => {
        if (/^manual$/i.test(key)) delete (seriesState as any)[key];
      });
    } catch {}
    if (newMode === "manual") {
      ensureSeries("manual", "Manuell", "#4caf50");
    } else {
      purgeManualSeriesHard();
    }
    reconcileActiveSeries();
    configureAlgoRunner();
    options.initManualEnv();
    chartKey.value += 1;
  }

  function onRunnerReset() {
    hardResetForMode(options.mode.value, "user-reset");
  }

  function onModeChange() {
    const label =
      options.mode.value === "manual" ? "Manuell" : "Algorithmisch";
    options.lastEventText.value = `Modus: ${label}`;
    hardResetForMode(options.mode.value, "mode-switch");
  }

  function onInited(payload?: { optimalAction?: number }) {
    if (options.debugEnabled.value && payload?.optimalAction != null) {
      options.lastEventText.value = `Init - optimaler Arm: ${payload.optimalAction}`;
    } else {
      options.lastEventText.value = "Initialisiert";
    }
    hardResetForMode(options.mode.value, "env-reinit");
  }

  const offRunner = algorithmsRunner.on((event: any) => {
    if (event.type === "CONFIGURED") {
      refreshRunnerEnvConfigs();
      reconcileActiveSeries();
      options.lastEventText.value = "Konfiguriert.";
    }
    if (event.type === "STARTED") {
      options.lastEventText.value = "Automatischer Lauf gestartet.";
    }
    if (event.type === "PAUSED") {
      options.lastEventText.value = "Pausiert.";
    }
    if (event.type === "STOPPED") {
      options.lastEventText.value = `Gestoppt: ${event.payload?.reason ?? "-"}`;
    }
    if (event.type === "RESULT") {
      handleRunnerResult(
        event.payload.policyId,
        event.payload.action,
        event.payload.reward,
        event.payload.isOptimal,
      );
    }
  });

  onBeforeUnmount(() => offRunner?.());

  watch(
    options.form,
    () => {
      if (options.mode.value === "manual") options.initManualEnv();
    },
    { deep: true },
  );

  watch(
    options.policyConfigs,
    () => {
      reconcileActiveSeries();
      configureAlgoRunner();
      chartKey.value += 1;
    },
    { deep: true, immediate: true },
  );

  return {
    runnerEnvConfigs,
    chartMetric,
    chartKey,
    seriesState,
    activeAlgoSeries,
    algoHistory,
    visibleMap,
    metricRows,
    chartSeries,
    configureAlgoRunner,
    refreshRunnerEnvConfigs,
    hardResetForMode,
    onRunnerReset,
    onModeChange,
    onInited,
    onToggleSeries,
    onChartToggle,
  };
}
