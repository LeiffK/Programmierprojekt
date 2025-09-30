// Metriken, die wir in der Tabelle ausrollen (Regret etc.)
// Hinweis: reward ist absichtlich generisch (CTR oder Watchtime), die UI betitelt das passend.
export interface iMetricsRow {
  seriesId: string;
  label: string;
  kind: "manual" | "algo";

  // Basiszahlen
  n: number; // wie viele Züge
  cumReward: number; // kumulierter Reward
  avgReward: number; // Durchschnitt (cum / n)

  // Qualität
  optimalPulls: number; // wie oft optimaler Arm gewählt
  bestChoiceRate: number; // Quote (optimalPulls / n)

  // Effizienz
  regret: number; // Summe (bestExpected - reward) – für Watchtime einfach „verpasste Sek.“
  lastAction?: number; // zuletzt gezogener Arm (Debug, nett zu haben)
  lastReward?: number; // zuletzt beobachteter Reward

  // UI-Flags
  visible: boolean; // für Chart/Legende später
}
