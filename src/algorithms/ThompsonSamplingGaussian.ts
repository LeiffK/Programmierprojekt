import type { iPullResult } from "../env/Domain/iPullResult.ts";
import type { iBanditEnv } from "../env/Domain/iBanditEnv.ts";
import { randNormal } from "../utils/randNormal.ts";
import { BasePolicy } from "./BasePolicy.ts";

/**
 * Thompson Sampling für Gaussian-Banditen.
 *
 * Modell:
 * - Beobachtungen (Rewards) ~ Normal(true_mean, sigma_obs^2).
 * - Prior für true_mean: Normal(mean0, priorVariance).
 * - Posterior nach Beobachtung bleibt Normal mit:
 *   precision_new = precision_old + 1/sigma_obs^2
 *   mean_new = (precision_old*mean_old + reward / sigma_obs^2) / precision_new
 *
 * Implementierung:
 * - Posterior wird durch arrays means (posterior means) und precisions (posterior precision = 1/Var) gehalten.
 * - Bei Auswahl wird aus jeder Normal(mean, stdDev) eine Stichprobe gezogen; Arm mit höchstem Stichprobenwert wird gewählt.
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
  }

  override reset(): void {
    super.reset();
    // Zufällige leichte Variation, um Symmetrie zwischen Armen zu brechen
    this.means = this.Q.map((m) => m + 1e-6 * (this.rng() - 0.5));
    this.precisions.fill(1 / this.priorVariance);
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

  public getMeans(): number[] {
    return this.means;
  }

  public getPrecisions(): number[] {
    return this.precisions;
  }

  public getObsVariances(): number[] {
    return this.obsVariances;
  }
}
