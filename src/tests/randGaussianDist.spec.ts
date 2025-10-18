import { describe, it, expect } from "vitest";
import { randGaussianDist } from "../env/GaussianBanditEnv.ts";

describe("randGaussianDist", () => {
  it("gibt ein Objekt mit mean und standardDeviation zurück", () => {
    const rng = () => 0.5;
    const result = randGaussianDist(rng);
    expect(result).toHaveProperty("mean");
    expect(result).toHaveProperty("standardDeviation");
    expect(typeof result.mean).toBe("number");
    expect(typeof result.standardDeviation).toBe("number");
  });

  it("mean liegt innerhalb von lowerBound und upperBound", () => {
    const rng = () => 0.5;
    const result = randGaussianDist(rng, 10, 50);
    expect(result.mean).toBeGreaterThanOrEqual(10);
    expect(result.mean).toBeLessThanOrEqual(50);
  });

  it("standardDeviation ist nicht-negativ", () => {
    const rng = () => 0.3;
    const result = randGaussianDist(rng, 0, 100);
    expect(result.standardDeviation).toBeGreaterThanOrEqual(0);
  });

  it("standardDeviationFactor beeinflusst Streuung", () => {
    let counter = 0;
    const rng = () => {
      const vals = [0.5, 0.3];
      return vals[counter++ % vals.length];
    };

    counter = 0;
    const result1 = randGaussianDist(rng, 0, 100, 0.5);

    counter = 0;
    const result2 = randGaussianDist(rng, 0, 100, 1.0);

    // Mit höherem Factor sollte standardDeviation größer sein
    expect(result2.standardDeviation).toBeGreaterThan(
      result1.standardDeviation,
    );
  });

  it("verwendet default-Werte korrekt", () => {
    const rng = () => 0.5;
    const result = randGaussianDist(rng);
    // Default: lowerBound=0, upperBound=300, factor=0.5
    expect(result.mean).toBeGreaterThanOrEqual(0);
    expect(result.mean).toBeLessThanOrEqual(300);
    expect(result.standardDeviation).toBeGreaterThanOrEqual(0);
  });

  it("unterschiedliche RNG-Werte geben unterschiedliche Ergebnisse", () => {
    const rng1 = () => 0.2;
    const result1 = randGaussianDist(rng1, 0, 100);

    const rng2 = () => 0.8;
    const result2 = randGaussianDist(rng2, 0, 100);

    expect(result1.mean).not.toBe(result2.mean);
  });

  it("standardDeviation skaliert mit Bereichsgröße", () => {
    let counter = 0;
    const rng = () => {
      const vals = [0.5, 0.7];
      return vals[counter++ % vals.length];
    };

    counter = 0;
    const smallRange = randGaussianDist(rng, 0, 10, 0.5);

    counter = 0;
    const largeRange = randGaussianDist(rng, 0, 1000, 0.5);

    // Größerer Bereich sollte größere StandardDeviation produzieren
    expect(largeRange.standardDeviation).toBeGreaterThan(
      smallRange.standardDeviation,
    );
  });

  it("funktioniert mit negativen Bounds", () => {
    const rng = () => 0.5;
    const result = randGaussianDist(rng, -100, -10);
    expect(result.mean).toBeGreaterThanOrEqual(-100);
    expect(result.mean).toBeLessThanOrEqual(-10);
    expect(result.standardDeviation).toBeGreaterThanOrEqual(0);
  });
});
