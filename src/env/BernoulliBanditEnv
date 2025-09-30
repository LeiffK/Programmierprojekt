import type { iPullResult, iEnvConfig } from "./Domain/iEnvConfig";
import { BanditEnv } from "./BanditEnv";

/**
 * Bernoulli Bandit Environment.
 * Jeder Arm liefert 1 (Erfolg) oder 0 (Fehlschlag) basierend auf Wahrscheinlichkeit.
 */
export class BernoulliBanditEnv extends BanditEnv {
  private readonly probs: number[];

  constructor(config: iEnvConfig) {
    super(config);

    if (!config.probs || config.probs.length !== config.arms) {
      throw new Error("Bernoulli config must define probs for each arm.");
    }

    this.probs = config.probs;
    this.optimalAction = this.probs.indexOf(Math.max(...this.probs));
  }

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
