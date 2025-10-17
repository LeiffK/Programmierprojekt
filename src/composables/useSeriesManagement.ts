import { ref, type Ref } from "vue";
import type { ManualStep } from "../domain/iHistory";
import type { iEnvConfig } from "../env/Domain/iEnvConfig";
import type { CustomPolicyRegistration } from "../algorithms/Domain/iCustomPolicyRegistration";
import {
  getSeriesState,
  setSeriesVisible,
  ensureSeries,
} from "../services/seriesStore";
import { algorithmsRunner } from "../services/algorithmsRunner";

export interface SeriesManagementOptions {
  policyConfigs: Ref<any>;
  form: Ref<iEnvConfig>;
  manualHistory: Ref<ManualStep[]>;
  manualCounts: Ref<number[]>;
}

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

export function useSeriesManagement(options: SeriesManagementOptions) {
  const { policyConfigs, form, manualHistory, manualCounts } = options;

  const seriesState = getSeriesState();
  type ActiveSeries = { id: string; label: string; color: string };
  const activeAlgoSeries = ref<ActiveSeries[]>([]);
  const algoHistory = ref<Record<string, ManualStep[]>>({});

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

  function resetPalette() {
    paletteIdx = 0;
  }

  function handleRunnerResult(policyId: string, action: number, reward: number, isOptimal: boolean) {
    const id = String(policyId);

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
      action,
      reward,
      isOptimal,
    });
  }

  return {
    seriesState,
    activeAlgoSeries,
    algoHistory,
    reconcileActiveSeries,
    isManualSeriesLike,
    purgeManualSeriesHard,
    prettyLabelFromId,
    resetPalette,
    handleRunnerResult,
  };
}
