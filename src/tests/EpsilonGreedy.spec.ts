import { describe, it, expect } from "vitest";
import { EpsilonGreedy } from "../algorithms/EpsilonGreedy.ts";

type Env = { config: { arms: number } };
const makeEnv = (arms = 3): Env => ({ config: { arms } });

describe("EpsilonGreedy Policy", () => {
  it("epsilon < 0 wird zu 0 → Greedy-Verhalten", () => {
    const eg = new EpsilonGreedy({ epsilon: -1, seed: 10 });
    eg.initialize(makeEnv(3) as any);
    (eg as any).Q = [0.1, 0.9, 0.2];
    expect(eg.selectAction()).toBe(1);
  });

  it("epsilon = 0 → reines Greedy", () => {
    const eg = new EpsilonGreedy({ epsilon: 0, seed: 123 });
    eg.initialize(makeEnv(3) as any);
    (eg as any).Q = [0.7, 0.3, 0.1];
    for (let i = 0; i < 10; i++) {
      expect(eg.selectAction()).toBe(0);
    }
  });

  it("epsilon > 1 wird zu 1 gerundet → Werte sind sinnvoll", () => {
    const eg = new EpsilonGreedy({ epsilon: 2, seed: 5 });
    eg.initialize(makeEnv(3) as any);
    (eg as any).Q = [10, -5, -6];

    const picked = new Set<number>();
    for (let i = 0; i < 30; i++) {
      picked.add(eg.selectAction());
    }
    expect(picked.size).toBeGreaterThan(1);
  });

  it("epsilon = 1 ignoriert Q und liefert verschiedene Arme", () => {
    const eg = new EpsilonGreedy({ epsilon: 1, seed: 77 });
    eg.initialize(makeEnv(3) as any);
    (eg as any).Q = [3, 2, 1];

    const picked = new Set<number>();
    for (let i = 0; i < 20; i++) {
      picked.add(eg.selectAction());
    }
    expect([...picked].some((a) => a !== 0)).toBe(true);
  });
});
