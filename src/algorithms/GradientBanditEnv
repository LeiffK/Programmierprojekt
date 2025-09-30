import type { iPullResult } from "../env/Domain/iPullResult";
import type { iBanditEnv } from "../env/Domain/iBanditEnv";
import { BasePolicy } from "./BasePolicy";

/**
 * Gradient Bandit Algorithmus.
 * Lernt numerische Präferenzen pro Arm und wählt Aktionen über Softmax-Policy.
 */
export class GradientBandit extends BasePolicy {
  private preferences: number[] = [];
  private averageReward: number = 0;

  constructor(protected cfg: { alpha?: number; seed?: number } = {}) {
    super(cfg);
  }

  override initialize(env: iBanditEnv): void {
    super.initialize(env);
    this.preferences = new Array(this.nArms).fill(0);
    this.averageReward = 0;
  }

  override reset(): void {
    super.reset();
    this.preferences.fill(0);
    this.averageReward = 0;
  }

  /**
   * Update der Präferenzen nach Gradient Bandit Formel
   * mit einem Schrittweiten-Parameter alpha (Standard 0.1).
   */
  override update(result: iPullResult): void {
    const alpha = this.cfg.alpha ?? 0.1;
    super.update(result);
    this.averageReward += (result.reward - this.averageReward) / this.t; // inkrementelles Mittel

    const action = result.action;
    const pi = this.getActionProbabilities();

    for (let a = 0; a < this.nArms; a++) {
      const baseline = this.averageReward;
      if (a === action) {
        this.preferences[a] += alpha * (result.reward - baseline) * (1 - pi[a]);
      } else {
        this.preferences[a] -= alpha * (result.reward - baseline) * pi[a];
      }
    }
  }

  /**
   * Wählt die Aktion mit Wahrscheinlichkeiten nach Softmax aus Präferenzen.
   */
  override selectAction(): number {
    const probs = this.getActionProbabilities();
    const r = this.rng();
    let cumulative = 0;
    for (let i = 0; i < probs.length; i++) {
      cumulative += probs[i];
      if (r < cumulative) {
        return i;
      }
    }
    // Als Fallback
    return this.nArms - 1;
  }

  /**
   * Berechnet Softmax-Wahrscheinlichkeiten aus Präferenzen.
   */
  private getActionProbabilities(): number[] {
    const maxPref = Math.max(...this.preferences);
    const expPrefs = this.preferences.map((p) => Math.exp(p - maxPref));
    const sumExp = expPrefs.reduce((a, b) => a + b, 0);
    return expPrefs.map((val) => val / sumExp);
  }
}
