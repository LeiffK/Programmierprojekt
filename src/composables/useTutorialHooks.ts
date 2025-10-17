import { nextTick, type Ref } from "vue";
import type { iEnvConfig } from "../env/Domain/iEnvConfig";
import type { ChartMetric } from "../domain/chart/iChartMetric";
import { algorithmsRunner } from "../services/algorithmsRunner";
import { setSeriesVisible } from "../services/seriesStore";

export interface TutorialHooksOptions {
  mode: Ref<"manual" | "algo">;
  onModeChange: () => void;
  onRunnerReset: () => void;
  form: Ref<iEnvConfig>;
  settingsOpen: Ref<boolean>;
  tableOpen: Ref<boolean>;
  onManual: (i: number) => Promise<void>;
  chartMetric: Ref<ChartMetric>;
}

export function useTutorialHooks(options: TutorialHooksOptions) {
  const {
    mode,
    onModeChange,
    onRunnerReset,
    form,
    settingsOpen,
    tableOpen,
    onManual,
    chartMetric,
  } = options;

  return {
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
}
