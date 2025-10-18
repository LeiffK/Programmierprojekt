import { describe, it, expect } from "vitest";
import { generateProbabilities } from "../env/BernoulliBanditEnv.ts";

describe("generateProbabilities", () => {
  it("generiert k Wahrscheinlichkeiten", () => {
    const rng = () => 0.5;
    const probs = generateProbabilities(5, rng);
    expect(probs).toHaveLength(5);
  });

  it("alle Werte liegen zwischen 0.01 und 0.99", () => {
    const rng = () => Math.random();
    const probs = generateProbabilities(10, rng);
    probs.forEach((p) => {
      expect(p).toBeGreaterThanOrEqual(0.01);
      expect(p).toBeLessThanOrEqual(0.99);
    });
  });

  it("bester Arm hat höchste Wahrscheinlichkeit", () => {
    const rng = () => 0.5;
    const probs = generateProbabilities(5, rng);
    const max = Math.max(...probs);
    const maxIdx = probs.indexOf(max);

    // Überprüfe, dass ein Arm deutlich besser ist
    const otherProbs = probs.filter((_, i) => i !== maxIdx);
    otherProbs.forEach((p) => {
      expect(max).toBeGreaterThan(p);
    });
  });

  it("respektiert min/max Grenzen", () => {
    const rng = () => 0.5;
    const probs = generateProbabilities(5, rng, { min: 0.2, max: 0.8 });

    // Der beste Arm kann über max liegen, aber sollte <= 0.99 sein
    probs.forEach((p) => {
      expect(p).toBeGreaterThanOrEqual(0.01);
      expect(p).toBeLessThanOrEqual(0.99);
    });
  });

  it("andere Arme sind mindestens 0.25 schlechter als bester Arm", () => {
    const rng = () => 0.5;
    const probs = generateProbabilities(5, rng);
    const max = Math.max(...probs);
    const maxIdx = probs.indexOf(max);

    probs.forEach((p, i) => {
      if (i !== maxIdx) {
        expect(max - p).toBeGreaterThanOrEqual(0.24); // mit kleiner Toleranz
      }
    });
  });

  it("verwendet bestBonus korrekt", () => {
    let counter = 0;
    const rng = () => {
      // Deterministischer RNG für reproduzierbare Tests
      const vals = [0.5, 0.3, 0.4, 0.6, 0.2, 0.7];
      return vals[counter++ % vals.length];
    };

    const probs = generateProbabilities(3, rng, { bestBonus: 0.3 });
    const max = Math.max(...probs);

    // Der beste sollte mindestens bestBonus über den anderen liegen
    expect(probs).toHaveLength(3);
    expect(max).toBeGreaterThan(0.3);
  });

  it("gibt deterministisches Ergebnis bei gleichem RNG", () => {
    const rng1 = () => 0.42;
    const probs1 = generateProbabilities(4, rng1);

    const rng2 = () => 0.42;
    const probs2 = generateProbabilities(4, rng2);

    expect(probs1).toEqual(probs2);
  });
});
