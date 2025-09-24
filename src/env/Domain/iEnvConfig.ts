export interface iEnvConfig {
  type: "bernoulli" | "gaussian";
  arms: number;
  probs?: number[]; // für Bernoulli-Wahrscheinlichkeiten pro Arm
  means?: number[]; // für Gaußsche Mittelwerte
  stdDev?: number[]; // für Gaußsche Standardabweichung
  seed: number; // optional: Reproduzierbarkei
  //rng: () => number; // bin noch nicht 100% sure ob necessary
}
