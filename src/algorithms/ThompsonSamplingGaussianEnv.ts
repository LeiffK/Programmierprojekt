import type { iPullResult } from "../env/Domain/iPullResult";
import type { iBanditEnv } from "../env/Domain/iBanditEnv";
import { BasePolicy } from "./BasePolicy";

/**
 * Thompson Sampling für Gaussian-Banditen.
 * Jeder Arm modelliert mit Normalverteilung, Posterior wird aktualisiert.
 * Dabei werden Mittelwert und Varianz adaptiv geschätzt.
 */
export class ThompsonSamplingGaussian extends BasePolicy {
  private means: number[] = [];
  private precisions: number[] = []; // Präzision = 1 / Varianz
  private priorVariance: number;

  constructor(cfg: { seed?: number; priorVariance?: number } = {}) {
    super(cfg);
    this.priorVariance = cfg.priorVariance ?? 1; // Standardvarianz Prior
  }

  override initialize(env: iBanditEnv): void {
    super.initialize(env);
    // Initialwerte für mean (Q) und Präzision
    this.means = this.Q.slice();
    this.precisions = new Array(this.nArms).fill(1 / this.priorVariance);
  }

  override reset(): void {
    super.reset();
    this.means.fill(0);
    this.precisions.fill(1 / this.priorVariance);
  }

  override update(result: iPullResult): void {
    super.update(result);

    const a = result.action;
    const n = this.N[a];
    const reward = result.reward;

    // Schätzung der Mittelwerte und Präzision nach Bayes (Normal-Normal Modell)
    // precisionNew = precisionOld + n
    // meanNew = (precisionOld * meanOld + n * reward) / precisionNew

    const priorPrecision = this.precisions[a];
    const oldMean = this.means[a];

    const precisionNew = priorPrecision + 1; // Annahme: Varianz der Beobachtung = 1
    const meanNew = (priorPrecision * oldMean + reward) / precisionNew;

    this.precisions[a] = precisionNew;
    this.means[a] = meanNew;

    this.Q[a] = meanNew; // Aktuelle Schätzung
  }

  override selectAction(): number {
    // Ziehe für jeden Arm eine Stichprobe aus Normalverteilung mit current mean & variance = 1 / precision
    const samples = this.means.map((mean, i) => {
      const variance = 1 / this.precisions[i];
      return this.normalSample(mean, Math.sqrt(variance));
    });

    return this.argmax(samples);
  }

  private normalSample(mean: number, stdDev: number): number {
    let u1 = 0,
      u2 = 0;
    while (u1 === 0) u1 = this.rng();
    u2 = this.rng();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }
}
