import { describe, it, expect } from "vitest";
import { BernoulliBanditEnv } from "../BernoulliBanditEnv";
import type { iEnvConfig } from "../Domain/iEnvConfig";

/**
 * Test-Suite für BernoulliBanditEnv.
 *
 * Prüft zentrale Eigenschaften der Bandit-Umgebung:
 * - Rewards liegen immer in {0,1}.
 * - Optimaler Arm wird korrekt ermittelt und markiert.
 * - Ungültige Konfigurationen werfen Fehler.
 */
describe("BernoulliBanditEnv", () => {
  // Basis-Konfiguration für Tests:
  // Zwei Arme mit Erfolgswahrscheinlichkeiten 0.8 (optimal) und 0.2
  const config: iEnvConfig = { type: "bernoulli", arms: 2, probs: [0.8, 0.2], seed: 1234 };

  /**
   * Test: Rewards sind immer 0 oder 1.
   * Erwartung:
   * - Beim Ziehen eines Arms (hier: Arm 0) wird nie ein anderer Wert zurückgegeben.
   */
  it("returns only 0 or 1 as rewards", () => {
    const env = new BernoulliBanditEnv(config);
    for (let i = 0; i < 100; i++) {
      const res = env.pull(0);
      expect([0, 1]).toContain(res.reward);
    }
  });

  /**
   * Test: Optimaler Arm wird richtig markiert.
   * Erwartung:
   * - optimalAction ist 0 (da 0.8 > 0.2).
   * - Ziehen von Arm 0 liefert isOptimal = true.
   * - Ziehen von Arm 1 liefert isOptimal = false.
   */
  it("marks optimal arm correctly", () => {
    const env = new BernoulliBanditEnv(config);
    expect(env.optimalAction).toBe(0);
    expect(env.pull(0).isOptimal).toBe(true);
    expect(env.pull(1).isOptimal).toBe(false);
  });

  /**
   * Test: Ungültige Konfiguration wirft Fehler.
   * Erwartung:
   * - Wenn Anzahl Wahrscheinlichkeiten (probs) != Anzahl Arme,
   *   wird ein Error geworfen.
   */
  it("throws on invalid config", () => {
    expect(() =>
      new BernoulliBanditEnv({ type: "bernoulli", arms: 2, probs: [0.8] } as iEnvConfig)
    ).toThrow();
  });
});
