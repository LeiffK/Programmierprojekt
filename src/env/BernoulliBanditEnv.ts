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

    let probs = config.probs;
    if (!Array.isArray(probs) || probs.length !== config.arms) {
      probs = this.generateProbabilities(config.arms);
    } else {
      probs = probs.map((p) => Number.isFinite(p) ? Math.min(Math.max(p, 0), 1) : 0);
    }

    // Erfolgswahrscheinlichkeiten speichern
    this.probs = probs;
    this.config.probs = [...this.probs];

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

  private generateProbabilities(k: number): number[] {
    const min = 0.05;
    const max = 0.6;
    const span = max - min;
    const out = Array.from({ length: k }, () =>
      Number((min + this.rng() * span).toFixed(4)),
    );
    const bestIdx = Math.max(0, Math.min(k - 1, Math.floor(this.rng() * k)));
    out[bestIdx] = Number(Math.min(0.9, out[bestIdx] + 0.25).toFixed(4));
    return out.map((p) => Math.min(Math.max(p, 0.01), 0.99));
  }
}
