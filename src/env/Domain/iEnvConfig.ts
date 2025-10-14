export interface iEnvConfig {
  type: "bernoulli" | "gaussian";
  arms: number;
  probs?: number[];      // für Bernoulli-Wahrscheinlichkeiten pro Arm (optional)
  means?: number[];      // für Gaußsche Mittelwerte (optional)
  stdDev?: number[];     // für Gaußsche Standardabweichung (optional)
  seed?: number;         // optional: Reproduzierbarkeit
  minProb?: number;      // optional: Minimalwert für generierte Bernoulli-Wahrscheinlichkeiten
  maxProb?: number;      // optional: Maximalwert für generierte Bernoulli-Wahrscheinlichkeiten
  bestBonus?: number;    // optional: Bonus für besten Arm bei Wahrscheinlichkeiten
  // rng?: () => number;  // optional, falls du den Zufallszahlengenerator extern übergeben willst
}
