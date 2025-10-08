/*import { describe, it, expect, beforeEach } from "vitest";
import type { iEnvConfig } from "../../env/Domain/iEnvConfig.ts";
import type { iBanditEnv } from "../../env/Domain/iBanditEnv.ts";
import type { iPullResult } from "../../env/Domain/iPullResult.ts";
import { UpperConfidenceBound } from "../UpperConfidenceBound.ts";

/**
 * Mock-Bernoulli-Umgebung:
 * - Jeder Arm hat feste Erfolgswahrscheinlichkeit p.
 * - pull liefert Reward 1 mit Wahrscheinlichkeit p, sonst 0.
 *
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

describe("UpperConfidenceBound", () => {
  let env: MockBernoulliEnv;
  let policy: UpperConfidenceBound;

  beforeEach(() => {
    env = new MockBernoulliEnv([0.9, 0.5, 0.2], 123);
    policy = new UpperConfidenceBound({ confidence: 2, seed: 123 });
    policy.initialize(env);
  });

  it("selects valid arms including initial exploring each arm once", () => {
    const chosenArms = new Set<number>();
    for (let i = 0; i < env.config.arms; i++) {
      const action = policy.selectAction();
      chosenArms.add(action);
      const result = env.pull(action);
      policy.update(result);
    }
    expect(chosenArms.size).toBe(env.config.arms);
  });

  it("selects arms after initial phase", () => {
    // Jeder Arm wird zunächst einmal gespielt
    for (let i = 0; i < env.config.arms; i++) {
      const action = policy.selectAction();
      policy.update(env.pull(action));
    }
    // Folgeauswahl
    for (let i = 0; i < 50; i++) {
      const action = policy.selectAction();
      expect(action).toBeGreaterThanOrEqual(0);
      expect(action).toBeLessThan(env.config.arms);

      const result = env.pull(action);
      policy.update(result);
    }
  });

  it("updates estimated means correctly", () => {
    const action = policy.selectAction();
    const result = env.pull(action);
    policy.update(result);

    const estimates = policy.getEstimates();
    expect(estimates.length).toBe(env.config.arms);
    expect(estimates[action]).toBeGreaterThanOrEqual(0);
  });
});
