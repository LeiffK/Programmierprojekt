import { describe, it, expect, beforeEach } from "vitest";
import { Greedy } from "../algorithms/greedy.ts";

type Env = { config: { arms: number } };
const makeEnv = (arms = 3): Env => ({ config: { arms } });

describe("Greedy Policy", () => {
  let pol: Greedy;

  beforeEach(() => {
    pol = new Greedy({ seed: 42 });
    pol.initialize(makeEnv(3) as any);
  });

  it("wählt den Arm mit dem höchsten Estimate", () => {
    (pol as any).Q = [0.1, 0.2, 0.9];
    expect(pol.selectAction()).toBe(2);
  });

  it("Tiebreak: bei Gleichstand wird einer der besten Arme gewählt", () => {
    (pol as any).Q = [0.5, 0.5, 0.1];
    const a = pol.selectAction();
    expect([0, 1]).toContain(a);
  });

  it("update aktualisiert Q korrekt (inkrementelles Mittel)", () => {
    pol.update({ action: 0, reward: 10, isOptimal: false });
    expect(pol.getEstimates()[0]).toBe(10);

    pol.update({ action: 0, reward: 0, isOptimal: false });
    expect(pol.getEstimates()[0]).toBe(5); // (10+0)/2
  });

  it("reset setzt alle Werte zurück", () => {
    pol.update({ action: 1, reward: 5, isOptimal: false });
    pol.reset();
    expect(pol.getEstimates()).toEqual([0, 0, 0]);
    expect(pol.getCounts()).toEqual([0, 0, 0]);
  });
});
