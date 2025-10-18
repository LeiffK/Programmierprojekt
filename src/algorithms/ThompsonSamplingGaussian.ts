import type { iPullResult } from "../env/Domain/iPullResult.ts";
import type { iBanditEnv } from "../env/Domain/iBanditEnv.ts";
import { randNormal } from "../utils/randNormal.ts";
import { BasePolicy } from "./BasePolicy.ts";
import type { iBanditPolicyConfig } from "./Domain/iBanditPolicyConfig.ts";

export interface ThompsonGaussianConfig extends iBanditPolicyConfig {
  priorMean?: number;
  priorVariance?: number;
  observationVariance?: number;
}

/**
 * Thompson Sampling für Gaussian-Banditen.
 *
 * Modell:
 * - Beobachtungen (Rewards) ~ Normal(true_mean, sigma_obs^2).
 * - Prior für true_mean: Normal(mean0, priorVariance).
 * - Posterior nach Beobachtung bleibt Normal mit:
 *   precision_new = precision_old + 1/sigma_obs^2
 *   mean_new = (precision_old * mean_old + reward / sigma_obs^2) / precision_new
 *
 * Implementierung:
 * - Posterior wird durch Arrays means (posterior means) und precisions (posterior precision = 1/Var) gehalten.
 * - Bei Auswahl wird aus jeder Normal(mean, stdDev) eine Stichprobe gezogen; der Arm mit dem höchsten Stichprobenwert wird gewählt.
 */
export class ThompsonSamplingGaussian extends BasePolicy {
  protected means: number[] = [];
  protected variances: number[] = [];
  protected observationVariances: number[] = [];
  private priorMean: number;
  private priorVariance: number;
  private defaultObservationVariance: number;

  constructor(cfg: ThompsonGaussianConfig = {}) {
    super(cfg);
    this.priorMean = cfg.priorMean ?? (cfg.optimisticInitialValue ?? 0);
    this.priorVariance = cfg.priorVariance ?? 1;
    this.defaultObservationVariance = cfg.observationVariance ?? 1;
  }

  protected onInitialize(env: iBanditEnv): void {
    this.means = Array.from({ length: this.nArms }, () => this.priorMean);
    this.variances = Array.from({ length: this.nArms }, () => this.priorVariance);
    this.observationVariances = this.resolveObservationVariance(env);
  }

  protected onReset(): void {
    this.means.fill(this.priorMean);
    this.variances.fill(this.priorVariance);
  }

  override selectAction(): number {
    const samples = this.means.map((mean, idx) => {
      const variance = Math.max(this.variances[idx], 1e-12);
      const stdDev = Math.sqrt(variance);
      return randNormal(this.rng, mean, stdDev);
    });

    return this.tiebreak(samples);
  }

  protected onUpdate(result: iPullResult): void {
    const idx = result.action;
    const obsVar = this.observationVariances[idx];
    const priorVar = this.variances[idx];
    const priorMean = this.means[idx];

    const posteriorVariance = 1 / (1 / priorVar + 1 / obsVar);
    const posteriorMean =
      posteriorVariance * (priorMean / priorVar + result.reward / obsVar);

    this.variances[idx] = posteriorVariance;
    this.means[idx] = posteriorMean;
  }

  private resolveObservationVariance(env: iBanditEnv): number[] {
    const cfg = env.config as any;
    if (Array.isArray(cfg.stdDev) && cfg.stdDev.length === this.nArms) {
      return cfg.stdDev.map((s: number) => Math.max(s, 0) ** 2);
    }
    if (typeof cfg.stdDev === "number") {
      return Array.from({ length: this.nArms }, () => Math.max(cfg.stdDev, 0) ** 2);
    }
    return Array.from({ length: this.nArms }, () => this.defaultObservationVariance);
  }

  public getMeans(): number[] {
    return [...this.means];
  }

  public getPrecisions(): number[] {
    return this.variances.map((v) => (v > 0 ? 1 / v : Number.POSITIVE_INFINITY));
  }

  public getObsVariances(): number[] {
    return [...this.observationVariances];
  }
}

