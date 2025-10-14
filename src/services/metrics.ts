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
  if (Array.isArray(cfg.means) && cfg.means.length) {
    return Math.max(...cfg.means);
  }
  return 0;
}

/**
 * Berechnet den optimalen Reward pro Schritt aus der History
 * (nutzt den tatsächlich erhaltenen Reward wenn isOptimal=true)
 */
function optimalRewardPerStepFrom(history: ManualStep[]): number {
  if (!history.length) return 0;
  const optimalRewards = history.filter(r => r.isOptimal).map(r => r.reward);
  if (!optimalRewards.length) return 0;
  return optimalRewards.reduce((sum, r) => sum + r, 0) / optimalRewards.length;
}

export function buildMetricsRowFromManual(
  history: ManualStep[],
  cfg: iEnvConfig | null | undefined,
  sCfg: iSeriesConfig,
): iMetricsRow {
  const n = history.length;
  const cumReward = history.reduce((s, r) => s + r.reward, 0);
  const avgReward = n ? cumReward / n : 0;
  const bestCount = history.filter((r) => r.isOptimal).length;
  const bestChoiceRate = n ? bestCount / n : 0;

  // Berechne Regret basierend auf tatsächlich erhaltenen optimalen Rewards
  const optimalRewardPerStep = optimalRewardPerStepFrom(history);
  const regret = optimalRewardPerStep > 0
    ? n * optimalRewardPerStep - cumReward
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
  // Berechne optimalen Reward aus tatsächlichen Beobachtungen
  const optimalRewards: number[] = [];
  let cum = 0;
  let bestCount = 0;
  let optimalRewardSum = 0;

  const points = {
    cumReward: [] as { step: number; y: number }[],
    avgReward: [] as { step: number; y: number }[],
    regret: [] as { step: number; y: number }[],
    bestRate: [] as { step: number; y: number }[],
  };

  history.forEach((r, i) => {
    const step = i + 1;
    cum += r.reward;
    bestCount += r.isOptimal ? 1 : 0;

    if (r.isOptimal) {
      optimalRewards.push(r.reward);
      optimalRewardSum += r.reward;
    }

    // Berechne Regret basierend auf tatsächlichen optimalen Rewards
    const avgOptimalReward = optimalRewards.length > 0
      ? optimalRewardSum / optimalRewards.length
      : 0;
    const regret = avgOptimalReward > 0
      ? step * avgOptimalReward - cum
      : 0;

    points.cumReward.push({ step, y: cum });
    points.avgReward.push({ step, y: cum / step });
    points.regret.push({ step, y: regret });
    points.bestRate.push({ step, y: bestCount / step });
  });

  return { config: { ...sCfg }, points };
}
