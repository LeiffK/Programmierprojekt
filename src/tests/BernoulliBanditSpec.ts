import { describe, it, expect } from "vitest";
import { BernoulliBanditEnv } from "../BernoulliBanditEnv.ts";
import type { iEnvConfig } from "../Domain/iEnvConfig";

describe("BernoulliBanditEnv", () => {
  // Basis-Konfiguration für Tests mit 2 Armen,
  // wobei Arm 0 eine Erfolgswahrscheinlichkeit von 0.8 hat und Arm 1 von 0.2.
  const config: iEnvConfig = {
    type: "bernoulli",
    arms: 2,
    probs: [0.8, 0.2],
    seed: 1234,
  };

  /**
   * Test: Rewards sind immer 0 oder 1.
   * Erwartung:
   * - Bei 100 Ziehungen des Arms 0 werden ausschließlich Werte 0 oder 1 ausgegeben.
   */
  it("returns only 0 or 1 as rewards", () => {
    const env = new BernoulliBanditEnv(config);
    for (let i = 0; i < 100; i++) {
      const result = env.pull(0);
      expect([0, 1]).toContain(result.reward);
    }
  });

  /**
   * Test: Optimaler Arm wird korrekt markiert.
   * Erwartung:
   * - optimalAction ist korrekt auf Arm 0 gesetzt (da 0.8 > 0.2).
   * - Ist der gezogene Arm der optimale, wird isOptimal true zurückgegeben.
   * - Bei einem anderen Arm ist isOptimal false.
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
   * - Wird die Anzahl der Wahrscheinlichkeiten nicht passend zur Anzahl der Arme übergeben,
   *   muss ein Fehler geworfen werden.
   */
  it("throws on invalid config", () => {
    expect(() =>
      new BernoulliBanditEnv({
        type: "bernoulli",
        arms: 2,
        probs: [0.8], // falsche Anzahl Wahrscheinlichkeiten
        seed: 42,
      } as iEnvConfig),
    ).toThrow();
  });
});
