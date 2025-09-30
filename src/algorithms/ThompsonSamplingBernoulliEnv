import type { iPullResult } from "../env/Domain/iPullResult";
import type { iBanditEnv } from "../env/Domain/iBanditEnv";
import { BasePolicy } from "./BasePolicy";

/**
 * Thompson Sampling für Bernoulli-Banditen.
 * Wählt je Runde den Arm mit der höchsten Stichprobe aus Beta-Verteilungen.
 * Nutzt posterior Beta-Verteilung für Erfolge/Misserfolge.
 */
export class ThompsonSamplingBernoulli extends BasePolicy {
  private successes: number[] = [];
  private failures: number[] = [];

  override initialize(env: iBanditEnv): void {
    super.initialize(env);
    this.successes = new Array(this.nArms).fill(0);
    this.failures = new Array(this.nArms).fill(0);
  }

  override reset(): void {
    super.reset();
    this.successes.fill(0);
    this.failures.fill(0);
  }

  override update(result: iPullResult): void {
    super.update(result);
    const a = result.action;
    if (result.reward === 1) {
      this.successes[a] += 1;
    } else {
      this.failures[a] += 1;
    }
  }

  /**
   * Wähle den Arm mit höchster Stichprobe aus Beta-Verteilung (Thompson Sampling).
   */
  override selectAction(): number {
    const samples = this.successes.map((s, i) => {
      const alpha = s + 1;  // Prior alpha=1 (uninformative)
      const beta = this.failures[i] + 1; // Prior beta=1
      return this.betaSample(alpha, beta);
    });
    return this.argmax(samples);
  }

  /**
   * Ziehe Stichprobe aus Beta(alpha, beta)
   * Nutze Inversion der regularisierten unvollständigen Betafunktion mit Gamma-Verteilungen.
   * Hier verwendet: Gamma-Verteilungen via Exponentialethode (Marsaglia).
   */
  private betaSample(alpha: number, beta: number): number {
    const gammaSample = (shape: number): number => {
      if (shape < 1) {
        const u = this.rng();
        return gammaSample(1 + shape) * Math.pow(u, 1 / shape);
      }
      const d = shape - 1 / 3;
      const c = 1 / Math.sqrt(9 * d);
      while (true) {
        let x = this.normalSample();
        let v = 1 + c * x;
        if (v <= 0) continue;
        v = v * v * v;
        const u = this.rng();
        if (
          u < 1 - 0.0331 * (x * x) * (x * x) ||
          Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))
        ) {
          return d * v;
        }
      }
    };

    const x = gammaSample(alpha);
    const y = gammaSample(beta);

    return x / (x + y);
  }

  /**
   * Ziehe Stichprobe aus Standardnormalverteilung.
   */
  private normalSample(): number {
    let u1 = 0,
      u2 = 0;
    while (u1 === 0) u1 = this.rng();
    u2 = this.rng();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }
}
