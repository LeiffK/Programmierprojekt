import { describe, it, expect } from "vitest";
import { randNormal } from "../env/GaussianBanditEnv.ts";

describe("randNormal", () => {
  it("gibt einen Wert nahe dem Mittelwert zurück (Standard N(0,1))", () => {
    const rng = () => 0.5;
    const result = randNormal(rng, 0, 1);
    expect(result).toBeTypeOf("number");
    expect(Number.isFinite(result)).toBe(true);
  });

  it("transformiert korrekt auf benutzerdefinierten Mittelwert", () => {
    // Mit festen Seeds sollte das Ergebnis reproduzierbar sein
    let counter = 0;
    const rng = () => {
      const vals = [0.5, 0.5];
      return vals[counter++ % vals.length];
    };
    const result = randNormal(rng, 100, 1);
    // Sollte in vernünftigem Bereich um 100 liegen (±5 Sigma)
    expect(result).toBeGreaterThan(95);
    expect(result).toBeLessThan(105);
  });

  it("skaliert korrekt mit Standardabweichung", () => {
    let counter = 0;
    const rng = () => {
      const vals = [0.1, 0.9];
      return vals[counter++ % vals.length];
    };
    const result1 = randNormal(rng, 0, 1);

    counter = 0;
    const result2 = randNormal(rng, 0, 10);

    // Bei gleichen rng-Werten sollte result2 etwa 10x so groß sein wie result1
    expect(Math.abs(result2 / result1)).toBeCloseTo(10, 0);
  });

  it("vermeidet u1 = 0 durch while-Schleife", () => {
    let callCount = 0;
    const rng = () => {
      callCount++;
      // Erst 0 zurückgeben, dann 0.5
      return callCount === 1 ? 0 : 0.5;
    };
    const result = randNormal(rng, 0, 1);
    expect(Number.isFinite(result)).toBe(true);
    expect(callCount).toBeGreaterThan(2); // mindestens 2 Aufrufe wegen u1=0
  });

  it("gibt unterschiedliche Werte für unterschiedliche RNG-Werte", () => {
    const rng1 = () => 0.1;
    const result1 = randNormal(rng1, 0, 1);

    const rng2 = () => 0.9;
    const result2 = randNormal(rng2, 0, 1);

    expect(result1).not.toBe(result2);
  });
});
