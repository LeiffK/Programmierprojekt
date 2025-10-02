import type { iEnvConfig } from "@/env/Domain/iEnvConfig";
import type { ManualStep } from "@/domain/iHistory";
import type { iMetricsRow } from "@/domain/iMetrics";
import type { iChartSeries } from "@/domain/chart/iChartSeries";
import type { iSeriesConfig } from "@/domain/chart/iSeriesConfig";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function regret(history: { reward: number }[], cfg?: iEnvConfig): number {
    if (!cfg?.means?.length) return 0;
    const best = Math.max(...cfg.means);
    return history.reduce((acc, h) => acc + (best - h.reward), 0);
}

export function buildMetricsRowFromHistory(
    seriesId: string,
    label: string,
    kind: "manual" | "algo",
    history: ManualStep[],
    cfg: iEnvConfig | undefined,
    s: iSeriesConfig,
): iMetricsRow {
    const n = history.length;
    const cumReward = sum(history.map(h => h.reward));
    const avgReward = n ? cumReward / n : 0;
    const bestChoiceRate = n ? history.filter(h => h.isOptimal).length / n : 0;

    return {
        seriesId, label, kind,
        visible: !!s.visible,
        n, cumReward, avgReward,
        bestChoiceRate,
        regret: regret(history, cfg),
        lastAction: n ? history[n-1].action : undefined,
        lastReward: n ? history[n-1].reward : undefined,
        color: s.color,
    };
}

export function buildSeriesFromHistory(
    id: string,
    label: string,
    kind: "manual" | "algo",
    history: ManualStep[],
    cfg: iEnvConfig | undefined,
    s: iSeriesConfig,
): iChartSeries {
    const points = {
        cumReward: [] as { step:number; y:number }[],
        avgReward: [] as { step:number; y:number }[],
        regret:    [] as { step:number; y:number }[],
        bestRate:  [] as { step:number; y:number }[],
    };

    let cum = 0, regretSum = 0;
    const best = cfg?.means ? Math.max(...cfg.means) : 0;

    history.forEach((h, i) => {
        const step = i + 1;
        cum += h.reward;
        regretSum += best - h.reward;

        points.cumReward.push({ step, y: cum });
        points.avgReward.push({ step, y: cum / step });
        points.regret.push({ step, y: regretSum });
        points.bestRate.push({
            step,
            y: history.slice(0, step).filter(x => x.isOptimal).length / step,
        });
    });

    return { config: { id, label, color: s.color, visible: !!s.visible, kind }, points };
}