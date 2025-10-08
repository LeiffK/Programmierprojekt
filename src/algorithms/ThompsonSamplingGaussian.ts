import type { iPullResult } from "../env/Domain/iPullResult.ts";
import type { iBanditEnv } from "../env/Domain/iBanditEnv.ts";
import { BasePolicy } from "./BasePolicy.ts";

/**
 * Thompson Sampling für Gaussian-Banditen.
 *
 * Modell:
 * - Beobachtungen (Rewards) ~ Normal(true_mean, sigma_obs^2).
 * - Prior für true_mean: Normal(mean0, priorVariance).
 * - Posterior nach Beobachtung bleibt Normal mit:
 *    precision_new = precision_old + 1/sigma_obs^2 (here sigma_obs^2 assumed = 1)
 *    mean_new = (precision_old*mean_old + reward / sigma_obs^2) / precision_new
 *
 * Implementierung:
 * - Posterior wird durch arrays means (posterior means) und precisions (posterior precision = 1/var) gehalten.
 * - Bei Auswahl wird aus jeder Normal(mean, stdDev) eine Stichprobe gezogen; Arm mit höchstem Stichprobenwert wird gewählt.
 */
export class ThompsonSamplingGaussian extends BasePolicy {
  protected means: number[] = []; // Posterior-Mittelwerte je Arm
  protected precisions: number[] = []; // Posterior-Präzisionen (1/Var) je Arm
  protected priorVariance: number; // Prior-Varianz (Var(mean_prior))

  /**
   * @param cfg.seed optionaler Seed, weitergegeben an BasePolicy
   * @param cfg.priorVariance Prior-Varianz (default 1)
   */
  constructor(cfg: { seed?: number; priorVariance?: number } = {}) {
    super(cfg);
    this.priorVariance = cfg.priorVariance ?? 1;
  }

  override initialize(env: iBanditEnv): void {
    super.initialize(env);
    // Startwerte: means aus BasePolicy.Q (initialisiert dort), precisions aus priorVariance
    this.means = this.Q.slice();
    const initPrecision = 1 / this.priorVariance;
    this.precisions = new Array(this.nArms).fill(initPrecision);
  }

  override reset(): void {
    super.reset();
    this.means.fill(0);
    this.precisions.fill(1 / this.priorVariance);
  }

  override update(result: iPullResult): void {
    super.update(result);

    const a = result.action;
    const reward = result.reward;

    const priorPrecision = this.precisions[a];
    const oldMean = this.means[a];

    // Annahme: Beobachtungsvarianz = 1 => observation precision = 1
    const obsPrecision = 1;
    const precisionNew = priorPrecision + obsPrecision;
    const meanNew =
      (priorPrecision * oldMean + obsPrecision * reward) / precisionNew;

    this.precisions[a] = precisionNew;
    this.means[a] = meanNew;

    // Spiegeln in Q (nützlich, falls Basisklasse mit Q arbeitet)
    this.Q[a] = meanNew;
  }

  override selectAction(): number {
    const samples = this.means.map((mean, i) => {
      const variance = 1 / this.precisions[i];
      const stdDev = Math.sqrt(variance);
      return this.normalSample(mean, stdDev);
    });

    return this.argmax(samples);
  }

  /**
   * Ziehe eine Normalstichprobe N(mean, stdDev^2) über Box-Muller.
   */
  private normalSample(mean: number, stdDev: number): number {
    let u1 = 0,
      u2 = 0;
    while (u1 === 0) u1 = this.rng();
    u2 = this.rng();

    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /**
   * Hilfsfunktion: Index des maximalen Elements (Break-Ties via rng aus BasePolicy möglich)
   */
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

  /** Getter für Tests */
  public getMeans(): number[] {
    return this.means;
  }

  public getPrecisions(): number[] {
    return this.precisions;
  }
}
