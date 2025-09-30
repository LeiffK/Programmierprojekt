import { describe, it, expect } from "vitest";
import { BernoulliBanditEnv } from "../BernoulliBanditEnv";
import type { iEnvConfig } from "../Domain/iEnvConfig";

describe("BernoulliBanditEnv", () => {
  const config: iEnvConfig = { type: "bernoulli", arms: 2, probs: [0.8, 0.2], seed: 1234 };

  it("returns only 0 or 1 as rewards", () => {
    const env = new BernoulliBanditEnv(config);
    for (let i = 0; i < 100; i++) {
      const res = env.pull(0);
      expect([0, 1]).toContain(res.reward);
    }
  });

  it("marks optimal arm correctly", () => {
    const env = new BernoulliBanditEnv(config);
    expect(env.optimalAction).toBe(0);
    expect(env.pull(0).isOptimal).toBe(true);
    expect(env.pull(1).isOptimal).toBe(false);
  });

  it("throws on invalid config", () => {
    expect(() => new BernoulliBanditEnv({ type: "bernoulli", arms: 2, probs: [0.8] } as iEnvConfig)).toThrow();
  });
});
