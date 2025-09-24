import { BanditEnv, EnvConfig, PullResult } from "../types"; // Schnittstellen für Bandit-Umgebung importieren

export class BernoulliBanditEnv implements BanditEnv {
  config: EnvConfig; // Konfigurationsobjekt der Umgebung mit Parametern wie Anzahl Arme und Wahrscheinlichkeiten
  optimalAction: number; // Index des optimalen Arms (höchste Gewinnwahrscheinlichkeit)

  constructor(config: EnvConfig) {
    if (!config.probs || config.probs.length !== config.arms) {
      throw new Error("Bernoulli config must define probs for each arm."); // Validierung: für jeden Arm muss eine Wahrscheinlichkeit vorliegen
    }
    this.config = config; // Speichere Konfiguration
    this.optimalAction = config.probs.indexOf(Math.max(...config.probs)); // Ermittle den Arm mit höchster Erfolgswahrscheinlichkeit
  }

  pull(action: number): PullResult {
    const p = this.config.probs![action]; // Erfolgswahrscheinlichkeit des gewählten Arms
    const reward = Math.random() < p ? 1 : 0; // Ziehe Bernoulli-Erfolg (1) oder Misserfolg (0) basierend auf Wahrscheinlichkeit
    return {
      action,
      reward,
      isOptimal: action === this.optimalAction, // Gibt an, ob die gewählte Aktion die beste ist
    };
  }
}
