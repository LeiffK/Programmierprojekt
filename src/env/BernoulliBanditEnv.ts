import type { iEnvConfig } from "./Domain/iEnvConfig";
import type { iPullResult } from "./Domain/iPullResult";
import { BanditEnv } from "./BanditEnv.ts";
import { randBernoulli } from "../utils/randBernoulli.ts";
import { generateProbabilities } from "../utils/generateProbabilities.ts"; // importieren

export class BernoulliBanditEnv extends BanditEnv {
  private readonly probs: number[];

  constructor(config: iEnvConfig) {
    super(config);

    if (config.type !== "bernoulli") {
      throw new Error(`BernoulliBanditEnv expects type to be "bernoulli".`);
    }

    let probs = config.probs;
    if (!Array.isArray(probs) || probs.length !== config.arms) {
      probs = generateProbabilities(config.arms, this.rng, {
        min: config.minProb,
        max: config.maxProb,
        bestBonus: config.bestBonus,
      });
    } else {
      probs = probs.map((p) =>
        Number.isFinite(p) ? Math.min(Math.max(p, 0), 1) : 0,
      );
    }

    this.probs = probs;
    this.config.probs = [...this.probs];

    const bestP = Math.max(...this.probs);
    this.optimalAction = this.probs.indexOf(bestP);
  }

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
