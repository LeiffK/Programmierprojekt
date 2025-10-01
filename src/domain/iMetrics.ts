export type iSeriesKind = "manual" | "algo";

export interface iMetricsRow {
    seriesId: string;
    label: string;
    kind: iSeriesKind;       // 'manual' oder 'algo'
    visible: boolean;

    n: number;               // Anzahl Züge
    cumReward: number;       // Summe Reward
    avgReward: number;       // Ø Reward
    bestChoiceRate: number;  // Anteil optimaler Züge (0..1)
    regret: number;          // Sum(bestMean - reward), kleiner = besser

    lastAction?: number;
    lastReward?: number;

    color?: string;          // optionale Farbe für Punkt/Curve
}