import { describe, it, expect, beforeEach } from "vitest";
import type { iEnvConfig } from "../../env/Domain/iEnvConfig";
import type { iBanditEnv } from "../../env/Domain/iBanditEnv";
import type { iPullResult } from "../../env/Domain/iPullResult";
import { ThompsonSamplingGaussian } from "../ThompsonSamplingGaussian";

class MockGaussianEnv implements iBanditEnv {
  config: iEnvConfig;
  optimalAction: number;

  private means: number[];
  private rng: () => number;

  constructor(means: number[], seed = 42) {
    this.config = { type: "gaussian", arms: means.length, means, seed };
    this.optimalAction = means.indexOf(Math.max(...means));
    this.means = means;
    this.rng = () => Math.random();
  }

  pull(action: number): iPullResult {
    // Simuliere Belohnung normalverteilt mit Mittelwert aus means[action]
    const mean = this.means[action];
    const reward = mean + (this.rng() - 0.5); // Einfacher Rauscheffekt
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

    expect(policy['means'][0]).not.toBe(0);
    expect(policy['precisions'][0]).toBeGreaterThan(0);
    expect(policy['means'][1]).not.toBe(0);
    expect(policy['precisions'][1]).toBeGreaterThan(0);
  });

  it("resets state", () => {
    policy.update({ action: 0, reward: 3.0, isOptimal: true });
    policy.reset();

    expect(policy['means'].every((v) => v === 0)).toBe(true);
    expect(policy['precisions'].every((v) => v === 1)).toBe(true);
    expect(policy.getCounts().every((v) => v === 0)).toBe(true);
  });
});
