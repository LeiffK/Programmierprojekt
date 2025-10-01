import { describe, it, expect, beforeEach } from "vitest";
import type { iEnvConfig } from "../../env/Domain/iEnvConfig";
import type { iBanditEnv } from "../../env/Domain/iBanditEnv";
import type { iPullResult } from "../../env/Domain/iPullResult";
import { ThompsonSamplingGaussian } from "../ThompsonSamplingGaussian";

/**
 * Mock-Umgebung für Gaussian-Banditen.
 * - Jeder Arm hat einen festen Mittelwert (Gaussian reward distribution).
 * - Rewards sind normalverteilt mit Mittelwert = means[action],
 *   Rauschen wird durch rng() - 0.5 simuliert (vereinfachte Normalapproximation).
 */
class MockGaussianEnv implements iBanditEnv {
  config: iEnvConfig;
  optimalAction: number;

  private means: number[];
  private rng: () => number;

  constructor(means: number[], seed = 42) {
    this.config = { type: "gaussian", arms: means.length, means, seed };
    this.optimalAction = means.indexOf(Math.max(...means));
    this.means = means;
    this.rng = () => Math.random();
  }

  pull(action: number): iPullResult {
    // Simuliere Reward ~ Normal(mean, 1)
    const mean = this.means[action];
    const reward = mean + (this.rng() - 0.5); // additiver Rauschterm als Approximation
    return { action, reward, isOptimal: action === this.optimalAction };
  }
}

/**
 * Test-Suite für ThompsonSamplingGaussian Policy.
 *
 * Geprüfte Kernaspekte:
 * - selectAction: wählt gültige Arm-Indizes.
 * - update: verändert Posterior-Parameter (means und precisions).
 * - reset: setzt internen Zustand auf Initialwerte zurück.
 */
describe("ThompsonSamplingGaussian", () => {
  let env: MockGaussianEnv;
  let policy: ThompsonSamplingGaussian;

  beforeEach(() => {
    // Environment: 3 Arme mit Mittelwerten [3.0, 1.0, 0.5], optimaler Arm = 0
    env = new MockGaussianEnv([3.0, 1.0, 0.5], 123);

    // Policy mit priorVariance = 1 (unsicherer, gleichmäßiger Start)
    policy = new ThompsonSamplingGaussian({ seed: 123, priorVariance: 1 });
    policy.initialize(env);
  });

  /**
   * Test: Policy wählt nur gültige Arme.
   * Erwartung:
   * - selectAction Rückgabewerte immer im Bereich [0, arms).
   * - Nach vielen Iterationen sind Auswahl und Update stabil.
   */
  it("selects valid arms", () => {
    for (let i = 0; i < 100; i++) {
      const action = policy.selectAction();
      expect(action).toBeGreaterThanOrEqual(0);
      expect(action).toBeLessThan(env.config.arms);

      const result = env.pull(action);
      policy.update(result);
    }
  });

  /**
   * Test: Update verändert die Posterior-Parameter korrekt.
   * Ablauf:
   * - reward=3.5 auf Arm 0 → mean[0] steigt, precision[0] erhöht sich.
   * - reward=0.7 auf Arm 1 → mean[1] passt sich an, precision[1] steigt.
   * Erwartung:
   * - means[a] ≠ 0 nach Updates.
   * - precisions[a] > 0 nach Updates.
   */
  it("updates means and precisions correctly", () => {
    const result1: iPullResult = { action: 0, reward: 3.5, isOptimal: true };
    const result2: iPullResult = { action: 1, reward: 0.7, isOptimal: false };

    policy.update(result1);
    policy.update(result2);

    expect(policy["means"][0]).not.toBe(0);
    expect(policy["precisions"][0]).toBeGreaterThan(0);
    expect(policy["means"][1]).not.toBe(0);
    expect(policy["precisions"][1]).toBeGreaterThan(0);
  });

  /**
   * Test: Reset stellt Policy-Zustand komplett zurück.
   * Erwartung:
   * - Alle means = 0 nach Reset.
   * - Alle precisions = 1/priorVariance (hier 1).
   * - Counts (N[a]) wieder 0.
   */
  it("resets state", () => {
    policy.update({ action: 0, reward: 3.0, isOptimal: true });
    policy.reset();

    expect(policy["means"].every((v) => v === 0)).toBe(true);
    expect(policy["precisions"].every((v) => v === 1)).toBe(true);
    expect(policy.getCounts().every((v) => v === 0)).toBe(true);
  });
});
