import { describe, it, expect, beforeEach } from "vitest";
import type { iEnvConfig } from "../env/Domain/iEnvConfig.ts";
import type { iBanditEnv } from "../env/Domain/iBanditEnv.ts";
import type { iPullResult } from "../env/Domain/iPullResult.ts";
import { GradientBandit } from "../algorithms/GradientBandit.ts";

/**
 * Mock-Umgebung für Bernoulli-Banditen.
 * - Einfaches Environment, das Rewards nach Bernoulli(p) zurückgibt.
 * - Dient als Testobjekt für die Policy (kein Zufallssamen hier fixiert).
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
    this.rng = () => Math.random(); // einfache RNG, nicht deterministisch (vereinfacht)
  }

  pull(action: number): iPullResult {
    const p = this.probs[action];
    const reward = this.rng() < p ? 1 : 0;
    return { action, reward, isOptimal: action === this.optimalAction };
  }
}

describe("GradientBandit", () => {
  let env: MockBernoulliEnv;
  let policy: GradientBandit;

  beforeEach(() => {
    env = new MockBernoulliEnv([0.7, 0.4, 0.2], 123);
    policy = new GradientBandit({ alpha: 0.1, seed: 123 });
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

  it("updates preferences and average reward", () => {
    const resultSuccess: iPullResult = {
      action: 0,
      reward: 1,
      isOptimal: true,
    };
    const resultFail: iPullResult = { action: 1, reward: 0, isOptimal: false };

    policy.update(resultSuccess);

    const avgAfterSuccess = policy.getAverageReward();
    const prefAfterSuccess = policy.getPreferences()[0];

    policy.update(resultFail);

    const avgAfterFail = policy.getAverageReward();
    const prefAfterFail = policy.getPreferences()[1];

    expect(avgAfterFail).not.toBeCloseTo(avgAfterSuccess, 8); // oder passende Genauigkeit
    expect(Math.abs(prefAfterSuccess)).not.toBeCloseTo(0, 8);
    expect(Math.abs(prefAfterFail)).not.toBeCloseTo(0, 8);


  });

  it("resets state correctly", () => {
    policy.update({ action: 0, reward: 1, isOptimal: true });
    policy.reset();

    expect(policy.getPreferences().every((v) => v === 0)).toBe(true);
    expect(policy.getAverageReward()).toBe(0);
    expect(policy.getCounts().every((v) => v === 0)).toBe(true);
  });
});
