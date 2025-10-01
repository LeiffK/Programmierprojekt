import type { iPullResult, iEnvConfig } from "./Domain/iEnvConfig";
import { BanditEnv } from "./BanditEnv";

/**
 * Bernoulli Bandit Environment.
 *
 * Modelliert eine Bandit-Umgebung, bei der jeder Arm eine Bernoulli-
 * Verteilung besitzt:
 * - Jeder Zug liefert entweder Reward = 1 (Erfolg) oder 0 (Misserfolg).
 * - Die Wahrscheinlichkeit eines Erfolges ist pro Arm festgelegt.
 *
 * Hauptaufgabe:
 * - Simulation der Rewards für gegebene Aktionen (Arme).
 * - Bestimmung des optimalen Arms (höchste Erfolgswahrscheinlichkeit).
 */
export class BernoulliBanditEnv extends BanditEnv {
  private readonly probs: number[]; // Erfolgswahrscheinlichkeit je Arm

  /**
   * Konstruktor der Bernoulli-Umgebung.
   *
   * @param config - Environment-Konfiguration mit:
   *   type  = "bernoulli"
   *   arms  = Anzahl der Arme
   *   probs = Erfolgswahrscheinlichkeit je Arm
   *
   * Validierungen:
   * - probs muss definiert sein.
   * - Länge von probs muss der Anzahl der Arme entsprechen.
   * - optimalAction wird automatisch aus max(probs) bestimmt.
   */
  constructor(config: iEnvConfig) {
    super(config);

    if (!config.probs || config.probs.length !== config.arms) {
      throw new Error("Bernoulli config must define probs for each arm.");
    }

    this.probs = config.probs;
    this.optimalAction = this.probs.indexOf(Math.max(...this.probs));
  }

  /**
   * Simuliert das Ziehen eines Arms.
   *
   * Ablauf:
   * 1. Hole Erfolgswahrscheinlichkeit p des gewählten Arms.
   * 2. Ziehe Reward = 1 (mit Wahrscheinlichkeit p) oder 0 (mit Wahrscheinlichkeit 1-p).
   * 3. Gib PullResult zurück:
   *    - action    = gewählter Arm
   *    - reward    = 0 oder 1
   *    - isOptimal = true, falls gewählter Arm = optimaler Arm
   *
   * @param action - Index des gewählten Arms
   * @returns iPullResult Objekt mit Reward und Info
   */
  pull(action: number): iPullResult {
    const p = this.probs[action];
    const reward = this.rng() < p ? 1 : 0;

    return {
      action,
      reward,
      isOptimal: action === this.optimalAction,
    };
  }
}
