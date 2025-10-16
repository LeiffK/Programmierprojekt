import { describe, it, expect, beforeEach } from "vitest";
import type { iEnvConfig } from "../env/Domain/iEnvConfig.ts";
import type { iBanditEnv } from "../env/Domain/iBanditEnv.ts";
import type { iPullResult } from "../env/Domain/iPullResult.ts";
import { ThompsonSamplingGaussian } from "../algorithms/ThompsonSamplingGaussian.ts";

/**
 * Mock Gaussian Env:
 * - Rewards ~ Normal(mean[action], 1)
 * - deterministische RNG zur Reproduzierbarkeit
 */
class MockGaussianEnv implements iBanditEnv {
  config: iEnvConfig;
  optimalAction: number;

  private means: number[];
  private rng: () => number;

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
  }

  pull(action: number): iPullResult {
    const mean = this.means[action];
    const noise = this.rng() - 0.5; // einfache Normal-Approximation
    const reward = mean + noise;
    return { action, reward, isOptimal: action === this.optimalAction };
  }
}

describe("ThompsonSamplingGaussian", () => {
  let env: MockGaussianEnv;
  let policy: ThompsonSamplingGaussian;

  beforeEach(() => {
    env = new MockGaussianEnv([3.0, 1.0, 0.5], 123);
    policy = new ThompsonSamplingGaussian({ seed: 123, priorVariance: 1 });
    policy.initialize(env);
  });

  it("selects valid arms", () => {
    for (let i = 0; i < 100; i++) {
      const action = policy.selectAction();
      expect(action).toBeGreaterThanOrEqual(0);
      expect(action).toBeLessThan(env.config.arms);

      const result = env.pull(action);
      policy.update(result);
    }
  });

  it("updates means and precisions correctly", () => {
    const result1: iPullResult = { action: 0, reward: 3.5, isOptimal: true };
    const result2: iPullResult = { action: 1, reward: 0.7, isOptimal: false };

    policy.update(result1);
    policy.update(result2);

    const means = policy.getMeans();
    const precisions = policy.getPrecisions();

    expect(means[0]).not.toBe(0);
    expect(precisions[0]).toBeGreaterThan(1);
    expect(means[1]).not.toBe(0);
    expect(precisions[1]).toBeGreaterThan(1);
  });

  it("resets state correctly", () => {
    policy.update({ action: 0, reward: 3.0, isOptimal: true });
    policy.reset();

    // means liegen nach reset nahe 0 (leichter Zufallsrausch)
    expect(policy.getMeans().every((v) => Math.abs(v) < 1e-3)).toBe(true);

    // precisions entsprechen 1 / priorVariance
    expect(
      policy.getPrecisions().every((v) => v === 1 / policy["priorVariance"]),
    ).toBe(true);

    // counts werden korrekt geleert
    expect(policy.getCounts().every((v) => v === 0)).toBe(true);
  });
});
