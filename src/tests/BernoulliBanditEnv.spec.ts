import { describe, it, expect } from "vitest";
import { BernoulliBanditEnv } from "../env/BernoulliBanditEnv.ts";
import type { iEnvConfig } from "../env/Domain/iEnvConfig.ts";

describe("BernoulliBanditEnv", () => {
  // Basiskonfig: 2 Arme, p=0.8 für Arm 0, p=0.2 für Arm 1
  const config: iEnvConfig = {
    type: "bernoulli",
    arms: 2,
    probs: [0.8, 0.2],
    seed: 1234,
  };

  it("returns only 0 or 1 as rewards", () => {
    const env = new BernoulliBanditEnv(config);
    for (let i = 0; i < 100; i++) {
      const result = env.pull(0);
      expect([0, 1]).toContain(result.reward);
    }
  });

  it("correctly marks the optimal arm", () => {
    const env = new BernoulliBanditEnv(config);
    expect(env.optimalAction).toBe(0);
    expect(env.pull(0).isOptimal).toBe(true);
    expect(env.pull(1).isOptimal).toBe(false);
  });

  it("auto-generates valid probabilities when missing or malformed", () => {
    const env = new BernoulliBanditEnv({
      type: "bernoulli",
      arms: 3,
      probs: [0.8],
      seed: 42,
    } as iEnvConfig);
    expect(env.config.probs).toBeDefined();
    expect(env.config.probs).toHaveLength(3);
    env.config.probs!.forEach((p) => {
      expect(p).toBeGreaterThan(0);
      expect(p).toBeLessThan(1);
    });
  });
});
