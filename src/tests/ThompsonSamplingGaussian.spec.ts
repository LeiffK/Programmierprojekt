import type { iPullResult } from "../env/Domain/iPullResult.ts";
import type { iBanditEnv } from "../env/Domain/iBanditEnv.ts";
import { randNormal } from "../utils/randNormal.ts";
import { BasePolicy } from "./BasePolicy.ts";

/**
 * Mock Gaussian Env:
 * - Rewards ~ Normal(mean[action], 1)
 * - deterministische RNG zur Reproduzierbarkeit
 */
export class ThompsonSamplingGaussian extends BasePolicy {
  protected means: number[] = [];
  protected precisions: number[] = [];
  protected priorVariance: number;
  protected obsVariances: number[] = [];

  constructor(cfg: { seed?: number; priorVariance?: number } = {}) {
    super(cfg);
    this.priorVariance = cfg.priorVariance ?? 1;
  }

<<<<<<< HEAD
  constructor(means: number[], seed = 42) {
    this.config = { type: "gaussian", arms: means.length, means, seed };
    this.optimalAction = means.indexOf(Math.max(...means));
    this.means = means;

    // einfache deterministische RNG (Linear Congruential Generator)
    let s = seed % 2147483647;
    this.rng = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
=======
  override initialize(env: iBanditEnv): void {
    super.initialize(env);
    this.means = this.Q.slice();
    const initPrecision = 1 / this.priorVariance;
    this.precisions = new Array(this.nArms).fill(initPrecision);

    // Beobachtungsvarianzen aus Env übernehmen
    const stds = (env.config as any).stdDev;
    if (Array.isArray(stds)) {
      this.obsVariances = stds.map((s: number) => s ** 2);
    } else if (typeof stds === "number") {
      this.obsVariances = new Array(this.nArms).fill(stds ** 2);
    } else {
      this.obsVariances = new Array(this.nArms).fill(1);
    }
>>>>>>> 4e145b27cc66f912ed1f40200b581d759290e8ab
  }

<<<<<<< HEAD
  pull(action: number): iPullResult {
    const mean = this.means[action];
    const noise = (this.rng() - 0.5); // einfache Normal-Approximation
    const reward = mean + noise;
    return { action, reward, isOptimal: action === this.optimalAction };
=======
  override reset(): void {
    super.reset();
    // Zufällige leichte Variation, um Symmetrie zwischen Armen zu brechen
    this.means = this.Q.map((m) => m + 1e-6 * (this.rng() - 0.5));
    this.precisions.fill(1 / this.priorVariance);
>>>>>>> 4e145b27cc66f912ed1f40200b581d759290e8ab
  }

  override update(result: iPullResult): void {
    super.update(result);
    const a = result.action;
    const reward = result.reward;

    const priorPrecision = this.precisions[a];
    const oldMean = this.means[a];

    const obsVar = this.obsVariances[a];
    const obsPrecision = 1 / obsVar;

    const precisionNew = priorPrecision + obsPrecision;
    const meanNew =
      (priorPrecision * oldMean + obsPrecision * reward) / precisionNew;

    this.precisions[a] = precisionNew;
    this.means[a] = meanNew;
    // Q hier NICHT aktualisieren, damit BasePolicy-Logik nicht überschrieben wird
  }

  override selectAction(): number {
    const samples = this.means.map((mean, i) => {
      const variance = 1 / this.precisions[i];
      const stdDev = Math.sqrt(variance);
      return randNormal(this.rng, mean, stdDev);
    });
    return this.argmax(samples);
  }

  private argmax(values: number[]): number {
    let best = -Infinity;
    let candidates: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (v > best) {
        best = v;
        candidates = [i];
      } else if (v === best) {
        candidates.push(i);
      }
    }
    const idx = Math.floor(this.rng() * candidates.length);
    return candidates[idx];
  }

<<<<<<< HEAD
    expect(means[0]).not.toBe(0);
    expect(precisions[0]).toBeGreaterThan(1);
    expect(means[1]).not.toBe(0);
    expect(precisions[1]).toBeGreaterThan(1);
  });
=======
  public getMeans(): number[] {
    return this.means;
  }
>>>>>>> 4e145b27cc66f912ed1f40200b581d759290e8ab

<<<<<<< HEAD
  it("resets state correctly", () => {
    policy.update({ action: 0, reward: 3.0, isOptimal: true });
    policy.reset();
=======
  public getPrecisions(): number[] {
    return this.precisions;
  }
>>>>>>> 4e145b27cc66f912ed1f40200b581d759290e8ab

<<<<<<< HEAD
    // means liegen nach reset nahe 0 (leichter Zufallsrausch)
    expect(policy.getMeans().every((v) => Math.abs(v) < 1e-3)).toBe(true);

    // precisions entsprechen 1 / priorVariance
    expect(policy.getPrecisions().every((v) => v === 1 / policy["priorVariance"])).toBe(true);

    // counts werden korrekt geleert
    expect(policy.getCounts().every((v) => v === 0)).toBe(true);
  });
});
=======
  public getObsVariances(): number[] {
    return this.obsVariances;
  }
}
>>>>>>> 4e145b27cc66f912ed1f40200b581d759290e8ab
