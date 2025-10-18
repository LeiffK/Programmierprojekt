import type { iEnvConfig } from "./Domain/iEnvConfig";
import type { iPullResult } from "./Domain/iPullResult";
import { randGaussianDist } from "../utils/randGaussianDist.ts";
import { BanditEnv } from "./BanditEnv.ts";
import { randNormal } from "../utils/randNormal.ts";

const SQRT2 = Math.sqrt(2);
const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const abs = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * abs);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-abs * abs);
  return sign * y;
}

function standardPdf(x: number): number {
  return Math.exp(-0.5 * x * x) * INV_SQRT_2PI;
}

function standardCdf(x: number): number {
  return 0.5 * (1 + erf(x / SQRT2));
}

function truncatedGaussianMean(mean: number, stdDev: number): number {
  if (stdDev <= 0) return Math.max(mean, 0);
  const alpha = (0 - mean) / stdDev;
  const oneMinusCdf = 1 - standardCdf(alpha);
  if (oneMinusCdf <= 1e-12) return Math.max(mean, 0);
  const adjustment = standardPdf(alpha) / oneMinusCdf;
  return mean + stdDev * adjustment;
}

export class GaussianBanditEnv extends BanditEnv {
  private truncatedMeans: number[] = [];

  constructor(config: iEnvConfig) {
    super(config);

    let means = config.means;
    let stdDev = config.stdDev;

    const hasMeans = Array.isArray(means);
    const hasStd = Array.isArray(stdDev);
    const generatedRandom = !hasMeans && !hasStd;

    if (generatedRandom) {
      means = [];
      stdDev = [];
      for (let i = 0; i < config.arms; i++) {
        const { mean, standardDeviation } = randGaussianDist(this.rng);
        means.push(mean);
        stdDev.push(standardDeviation);
      }
    } else if (hasMeans && hasStd) {
      if (means!.length !== config.arms || stdDev!.length !== config.arms) {
        throw new Error(
          "Gaussian config must define 'means' and 'standard deviation' for each arm.",
        );
      }
    } else {
      throw new Error("Provide either both 'means' and 'stdDev', or none.");
    }

    if (stdDev!.some((v) => v < 0)) {
      throw new Error("Gaussian standard deviation must be non-negative.");
    }

    this.config.means = means!;
    this.config.stdDev = stdDev!;

    if (generatedRandom && this.config.means.length > 1) {
      const sorted = [...this.config.means].sort((a, b) => b - a);
      const second = sorted[1] ?? sorted[0];
      const bestIndex = this.config.means.indexOf(sorted[0]);
      const required = second + 75;
      if (this.config.means[bestIndex] < required) {
        this.config.means[bestIndex] = required;
      }
    }

    this.truncatedMeans = means!.map((m, idx) =>
      truncatedGaussianMean(m, stdDev![idx]),
    );
    const bestMean = Math.max(...this.truncatedMeans);
    this.optimalAction = this.truncatedMeans.indexOf(bestMean);
    (this.config as any).truncatedMeans = [...this.truncatedMeans];
  }

  pull(action: number): iPullResult {
    const mean = this.config.means![action];
    const stdDev = this.config.stdDev![action];
    let reward: number;
    do {
      reward = randNormal(this.rng, mean, stdDev);
    } while (reward < 0);

    return {
      action,
      reward,
      isOptimal: action === this.optimalAction,
    };
  }
}
