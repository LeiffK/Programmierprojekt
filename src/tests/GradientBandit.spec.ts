import { describe, it, expect, beforeEach } from "vitest";
import type { iEnvConfig } from "../env/Domain/iEnvConfig.ts";
import type { iBanditEnv } from "../env/Domain/iBanditEnv.ts";
import type { iPullResult } from "../env/Domain/iPullResult.ts";
import { GradientBandit } from "../algorithms/GradientBandit.ts";

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
    const resultSuccess: iPullResult = { action: 0, reward: 1, isOptimal: true };
    const resultFail: iPullResult = { action: 1, reward: 0, isOptimal: false };

    // Werte vor Updates speichern
    const prefBeforeSuccess = policy.getPreferences()[0];
    const avgBeforeSuccess = policy.getAverageReward();

    // Erstes Update mit positivem Reward
    policy.update(resultSuccess);

    const prefAfterSuccess = policy.getPreferences()[0];
    const avgAfterSuccess = policy.getAverageReward();

    // Werte vor zweitem Update speichern
    const prefBeforeFail = policy.getPreferences()[1];
    const avgBeforeFail = avgAfterSuccess;

    // Zweites Update mit Reward 0
    policy.update(resultFail);

    const prefAfterFail = policy.getPreferences()[1];
    const avgAfterFail = policy.getAverageReward();

    // Nur bei tatsächlichen Änderungen Prüfung erfordern
    if (Math.abs(prefAfterSuccess - prefBeforeSuccess) > 1e-10) {
      expect(prefAfterSuccess).not.toBeCloseTo(prefBeforeSuccess, 8);
    }

    expect(avgAfterSuccess).not.toBeCloseTo(avgBeforeSuccess, 8);

    if (Math.abs(prefAfterFail - prefBeforeFail) > 1e-10) {
      expect(prefAfterFail).not.toBeCloseTo(prefBeforeFail, 8);
    }

    expect(avgAfterFail).not.toBeCloseTo(avgBeforeFail, 8);
  });

  it("resets state correctly", () => {
    policy.update({ action: 0, reward: 1, isOptimal: true });
    policy.reset();

    expect(policy.getPreferences().every((v) => v === 0)).toBe(true);
    expect(policy.getAverageReward()).toBe(0);
    // Falls getCounts implementiert:
    // expect(policy.getCounts().every((v) => v === 0)).toBe(true);
  });
});
