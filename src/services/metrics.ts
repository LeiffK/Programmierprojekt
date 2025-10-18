import type { ManualStep } from "../domain/iHistory";
import type { iMetricsRow } from "../domain/iMetrics";
import type { iChartSeries } from "../domain/chart/iChartSeries";
import type { iSeriesConfig } from "../domain/chart/iSeriesConfig";
import type { iEnvConfig } from "../env/Domain/iEnvConfig";

function bestMeanFrom(cfg?: iEnvConfig | null): number {
  if (!cfg) return 0;
  if (
    cfg.type === "bernoulli" &&
    Array.isArray(cfg.probs) &&
    cfg.probs.length
  ) {
    return Math.max(...cfg.probs);
  }
  const truncated = (cfg as any).truncatedMeans;
  if (Array.isArray(truncated) && truncated.length) {
    return Math.max(...truncated);
  }
  if (Array.isArray(cfg.means) && cfg.means.length) {
    return Math.max(...cfg.means);
  }
  return 0;
}

function bestActionIndex(cfg?: iEnvConfig | null): number | null {
  if (!cfg) return null;
  if (cfg.type === "bernoulli" && Array.isArray(cfg.probs) && cfg.probs.length) {
    const max = Math.max(...cfg.probs);
    return cfg.probs.indexOf(max);
  }
  if (Array.isArray(cfg.means) && cfg.means.length) {
    const max = Math.max(...cfg.means);
    return cfg.means.indexOf(max);
  }
  return null;
}

function isBestAction(cfg: iEnvConfig | null | undefined, action: number): boolean {
  const idx = bestActionIndex(cfg);
  if (idx == null) return false;
  return action === idx;
}

function regretContribution(bestMean: number, step: ManualStep): number {
  if (!Number.isFinite(bestMean)) return 0;
  if (step.isOptimal) return 0;
  const delta = bestMean - step.reward;
  return delta > 0 ? delta : 0;
}

export function buildMetricsRowFromManual(
  history: ManualStep[],
  cfg: iEnvConfig | null | undefined,
  sCfg: iSeriesConfig,
): iMetricsRow {
  const n = history.length;
  const cumReward = history.reduce((s, r) => s + r.reward, 0);
  const avgReward = n ? cumReward / n : 0;
  const bestIdx = bestActionIndex(cfg);
  const bestCount =
    bestIdx != null
      ? history.reduce((sum, step) => sum + (step.action === bestIdx ? 1 : 0), 0)
      : history.filter((r) => r.isOptimal).length;
  const bestChoiceRate = n ? bestCount / n : 0;

  const bestMean = bestMeanFrom(cfg);
  const regret = n
    ? history.reduce((sum, step) => sum + regretContribution(bestMean, step), 0)
    : 0;

  return {
    seriesId: sCfg.id,
    label: sCfg.label,
    kind: sCfg.id === "manual" ? "manual" : "algo",
    visible: !!sCfg.visible,
    n,
    cumReward,
    avgReward,
    bestChoiceRate,
    regret,
    lastAction: n ? history[n - 1].action : undefined,
    lastReward: n ? history[n - 1].reward : undefined,
    color: sCfg.color,
  };
}

export function buildSeriesFromManual(
  history: ManualStep[],
  cfg: iEnvConfig | null | undefined,
  sCfg: iSeriesConfig,
): iChartSeries {
  const bestMean = bestMeanFrom(cfg);
  const bestIdx = bestActionIndex(cfg);

  let cum = 0;
  let bestCount = 0;
  let regret = 0;

  const points = {
    cumReward: [] as { step: number; y: number }[],
    avgReward: [] as { step: number; y: number }[],
    regret: [] as { step: number; y: number }[],
    bestRate: [] as { step: number; y: number }[],
  };

  history.forEach((r, i) => {
    const step = i + 1;
    cum += r.reward;
    const isBest =
      bestIdx != null ? r.action === bestIdx : r.isOptimal ?? false;
    bestCount += isBest ? 1 : 0;
    regret += regretContribution(bestMean ?? 0, r);

    points.cumReward.push({ step, y: cum });
    points.avgReward.push({ step, y: cum / step });
    points.regret.push({ step, y: regret });
    points.bestRate.push({ step, y: bestCount / step });
  });

  return { config: { ...sCfg }, points };
}
