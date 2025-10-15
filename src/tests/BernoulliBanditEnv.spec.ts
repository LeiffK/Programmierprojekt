import { describe, it, expect } from "vitest";
import { BernoulliBanditEnv } from "../env/BernoulliBanditEnv.ts";
import type { iEnvConfig } from "../env/Domain/iEnvConfig.ts";

/**
 * Test-Suite für BernoulliBanditEnv
 *
 * Ziele dieser Tests:
 * - Sicherstellen, dass Rewards korrekt als 0/1 erzeugt werden.
 * - Überprüfen, dass der optimale Arm korrekt markiert ist.
 * - Prüfen, dass Parameter bei fehlerhaften Inputs sauber generiert werden.
 * - Validieren, dass die Generierung deterministisch (Seed-basiert) funktioniert.
 */
describe("BernoulliBanditEnv", () => {

  // Basis-Konfiguration mit zwei Armen und festen Wahrscheinlichkeiten
  const baseConfig: iEnvConfig = {
    type: "bernoulli",
    arms: 2,
    probs: [0.8, 0.2],
    seed: 1234,
  };

  it("returns only 0 or 1 as rewards", () => {
    const env = new BernoulliBanditEnv(baseConfig);
    for (let i = 0; i < 100; i++) {
      const result = env.pull(0);
      expect([0, 1]).toContain(result.reward);
    }
  });

  it("correctly marks the optimal arm", () => {
    const env = new BernoulliBanditEnv(baseConfig);

    // Arm mit der größten Erfolgswahrscheinlichkeit wird als optimal erkannt
    expect(env.optimalAction).toBe(0);

    // Überprüfen, dass das Flag isOptimal korrekt gesetzt wird
    expect(env.pull(0).isOptimal).toBe(true);
    expect(env.pull(1).isOptimal).toBe(false);
  });

  it("auto-generates valid probabilities when missing or malformed", () => {
    // absichtlich kaputte Konfiguration (nur ein p statt 3)
    const faultyConfig: iEnvConfig = {
      type: "bernoulli",
      arms: 3,
      probs: [0.8],
      seed: 42,
    };

    const env = new BernoulliBanditEnv(faultyConfig);

    // Wahrscheinlichkeiten sollten automatisch generiert werden
    expect(env.config.probs).toBeDefined();
    expect(env.config.probs).toHaveLength(3);

    // Werte müssen im erlaubten Bereich liegen (inkl. Begrenzung aus generateProbabilities)
    env.config.probs!.forEach((p) => {
      expect(p).toBeGreaterThanOrEqual(0.01);
      expect(p).toBeLessThanOrEqual(0.99);
    });
  });

  it("generates reproducible probabilities with the same seed", () => {
    // gleiche Seeds => deterministische Ergebnisse
    const cfg: iEnvConfig = {
      type: "bernoulli",
      arms: 4,
      seed: 777,
      minProb: 0.1,
      maxProb: 0.8,
      bestBonus: 0.2,
    };

    const env1 = new BernoulliBanditEnv(cfg);
    const env2 = new BernoulliBanditEnv(cfg);

    // Probabilities müssen exakt übereinstimmen (Seed-Kontrolle)
    expect(env1.config.probs).toEqual(env2.config.probs);

    // zusätzlich: Werte im erwarteten Bereich prüfen
    env1.config.probs!.forEach((p) => {
      expect(p).toBeGreaterThanOrEqual(0.1);
      expect(p).toBeLessThanOrEqual(0.99);
    });
  });
});
