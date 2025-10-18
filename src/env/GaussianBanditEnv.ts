import type { iEnvConfig } from "./Domain/iEnvConfig";
import type { iPullResult } from "./Domain/iPullResult";
import { BanditEnv } from "./BanditEnv.ts";

export function randGaussianDist(
  rng: () => number,
  lowerBound: number = 0,
  upperBound: number = 300,
  standardDeviationFactor: number = 0.5,
) {
  const mean = rng() * (upperBound - lowerBound) + lowerBound;
  const standardDeviation =
    Math.abs(rng() * (upperBound - lowerBound) + lowerBound - mean) *
    standardDeviationFactor;
  return { mean, standardDeviation };
}

export function randNormal(
  rng: () => number,
  mean: number = 0,
  stdDev: number = 1,
): number {
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) u1 = rng();
  u2 = rng();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
}

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
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-abs * abs);
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

    this.truncatedMeans = this.config.means.map((m, idx) =>
      truncatedGaussianMean(m, this.config.stdDev![idx]),
    );
    if (generatedRandom && this.truncatedMeans.length > 1) {
      let sortedTrunc = [...this.truncatedMeans].sort((a, b) => b - a);
      let bestTrunc = sortedTrunc[0];
      const targetGap = (sortedTrunc[1] ?? sortedTrunc[0]) + 75;
      const bestIdx = this.truncatedMeans.indexOf(bestTrunc);
      let iterations = 0;
      while (bestTrunc < targetGap && iterations < 10) {
        const currentMean = this.config.means![bestIdx];
        const delta = targetGap - bestTrunc;
        this.config.means![bestIdx] = currentMean + delta + 1; // push deutlich darüber
        this.truncatedMeans[bestIdx] = truncatedGaussianMean(
          this.config.means![bestIdx],
          this.config.stdDev![bestIdx],
        );
        bestTrunc = this.truncatedMeans[bestIdx];
        sortedTrunc = [...this.truncatedMeans].sort((a, b) => b - a);
        iterations += 1;
      }
    }
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
