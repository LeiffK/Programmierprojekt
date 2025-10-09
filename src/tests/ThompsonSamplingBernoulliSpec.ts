import { describe, it, expect, beforeEach } from "vitest";
import type { iEnvConfig } from "../env/Domain/iEnvConfig";
import type { iBanditEnv } from "../env/Domain/iBanditEnv";
import type { iPullResult } from "../env/Domain/iPullResult";
import { ThompsonSamplingBernoulli } from "../algorithms/ThompsonSamplingBernoulli.ts";

/**
 * Mock-Umgebung (Bernoulli) für Tests der ThompsonSampling Policy.
 * - Rewards basieren auf festen Erfolgswahrscheinlichkeiten.
 * - RNG ist einfache Math.random(), Seed wird ignoriert.
 */
class MockBernoulliEnv implements iBanditEnv {
  config: iEnvConfig;
  optimalAction: number;

  private probs: number[];
  private rng: () => number;

  constructor(probs: number[], seed = 42) {
    this.config = { type: "bernoulli", arms: probs.length, probs, seed };
    this.optimalAction = probs.indexOf(Math.max(...probs));
    this.probs = probs;
    this.rng = () => Math.random();
  }

  pull(action: number): iPullResult {
    const p = this.probs[action];
    const reward = this.rng() < p ? 1 : 0;
    return { action, reward, isOptimal: action === this.optimalAction };
  }
}

describe("ThompsonSamplingBernoulli", () => {
  let env: MockBernoulliEnv;
  let policy: ThompsonSamplingBernoulli;

  beforeEach(() => {
    env = new MockBernoulliEnv([0.9, 0.5, 0.3], 123);
    policy = new ThompsonSamplingBernoulli({ seed: 123 });
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

  it("updates successes and failures correctly", () => {
    const resultSuccess: iPullResult = {
      action: 0,
      reward: 1,
      isOptimal: true,
    };
    const resultFail: iPullResult = { action: 1, reward: 0, isOptimal: false };

    policy.update(resultSuccess);
    const succAfter = policy.getSuccesses()[0];

    policy.update(resultFail);
    const failAfter = policy.getFailures()[1];

    expect(succAfter).toBeGreaterThan(0);
    expect(failAfter).toBeGreaterThan(0);
  });

  it("resets state correctly", () => {
    policy.update({ action: 0, reward: 1, isOptimal: true });
    policy.update({ action: 1, reward: 0, isOptimal: false });

    policy.reset();

    expect(policy.getSuccesses().every((s) => s === 1)).toBe(true);
    expect(policy.getFailures().every((f) => f === 1)).toBe(true);
    expect(policy.getCounts().every((n) => n === 0)).toBe(true);
  });
});
