import type { iEnvConfig } from "./Domain/iEnvConfig";
import type { iPullResult } from "./Domain/iPullResult";
import { BanditEnv } from "./BanditEnv.ts";
import { randBernoulli } from "../utils/randBernoulli.ts";

/**
 * Bernoulli Bandit Environment.
 *
 * Modelliert eine Umgebung mit binären Rewards (0 oder 1).
 * Jeder Arm hat eine feste Erfolgswahrscheinlichkeit p.
 * Ziel: Simulation der Rewards und Bestimmung des optimalen Arms.
 */
export class BernoulliBanditEnv extends BanditEnv {
  private readonly probs: number[];

  constructor(config: iEnvConfig) {
    super(config);

    // Prüfen: Typ muss bernoulli sein
    if (config.type !== "bernoulli") {
      throw new Error(`BernoulliBanditEnv expects type to be "bernoulli".`);
    }

    // Prüfen: probs definiert und Länge korrekt
    if (!config.probs || config.probs.length !== config.arms) {
      throw new Error(`Bernoulli config must define 'probs' for each arm.`);
    }

    // Erfolgswahrscheinlichkeiten speichern
    this.probs = config.probs;

    // Optimalen Arm (höchste p) ermitteln
    const bestP = Math.max(...this.probs);
    this.optimalAction = this.probs.indexOf(bestP);
  }

  /**
   * Simuliert das Ziehen eines Arms: liefert Reward ∈ {0,1}.
   *
   * @param action - Index des gewählten Arms
   * @returns Ergebnisobjekt mit Reward und Info, ob optimaler Arm
   */
  pull(action: number): iPullResult {
    const p = this.probs[action];
    const reward = randBernoulli(this.rng, p);

    return {
      action,
      reward,
      isOptimal: action === this.optimalAction,
    };
  }
}
