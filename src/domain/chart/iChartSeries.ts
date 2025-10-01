import type { ChartMetric } from "./iChartMetric";
import type { iChartPoint } from "./iChartPoint";
import type { iSeriesConfig } from "./iSeriesConfig";

// Eine Serie = Config + ihre Zeitreihen (pro Kennzahl eine Reihe)
export interface iChartSeries {
    config: iSeriesConfig;
    points: Record<ChartMetric, iChartPoint[]>;
}