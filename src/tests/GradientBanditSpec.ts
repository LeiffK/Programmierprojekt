import { describe, it, expect, beforeEach } from "vitest";
import type { iEnvConfig } from "../../env/Domain/iEnvConfig";
import type { iBanditEnv } from "../../env/Domain/iBanditEnv";
import type { iPullResult } from "../../env/Domain/iPullResult";
import { GradientBandit } from "../GradientBandit";

/**
 * Mock-Umgebung für Bernoulli-Banditen.
 * - Einfaches Environment, das Rewards nach Bernoulli(p) zurückgibt.
 * - Dient als Testobjekt für die Policy (kein Zufallssamen hier fixiert).
 */
class MockBernoulliEnv implements iBanditEnv {
  config: iEnvConfig;
  optimalAction: number;

  private probs: number[];
  private rng: () => number;

  constructor(probs: number[], seed = 42) {
    this.config = { type: "bernoulli", arms: probs.length, probs, seed };
    this.optimalAction = probs.indexOf(Math.max(...probs));
    this.probs = probs;
    this.rng = () => Math.random(); // einfache RNG, nicht deterministisch (vereinfacht)
  }

  pull(action: number): iPullResult {
    const p = this.probs[action];
    const reward = this.rng() < p ? 1 : 0;
    return { action, reward, isOptimal: action === this.optimalAction };
  }
}

/**
 * Test-Suite für GradientBandit-Policy.
 *
 * Geprüfte Aspekte:
 * - Auswahl von gültigen Aktionen (Index-Bereich).
 * - Update-Mechanismus für Präferenzen + Durchschnittsreward.
 * - Reset-Funktion zur Rücksetzung des internen Zustands.
 */
describe("GradientBandit", () => {
  let env: MockBernoulliEnv;
  let policy: GradientBandit;

  beforeEach(() => {
    // Setup: Environment mit 3 Armen (p=[0.7,0.4,0.2]), Policy mit alpha=0.1
    env = new MockBernoulliEnv([0.7, 0.4, 0.2], 123);
    policy = new GradientBandit({ alpha: 0.1, seed: 123 });
    policy.initialize(env);
  });

  /**
   * Test: Policy gibt nur gültige Arme zurück.
   * Erwartung:
   * - selectAction liefert Werte im Bereich [0, arms).
   * - Nach mehreren Iterationen sind alle Züge konsistent verarbeitbar.
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
   * Test: Update verändert Präferenzen und Durchschnittsreward.
   * Ablauf:
   * - Zunächst ein Reward=1 auf Arm 0 → Präferenz[0] und averageReward sollten steigen.
   * - Dann ein Reward=0 auf Arm 1 → Präferenz[1] sinkt/ändert sich, averageReward wird angepasst.
   * Erwartung:
   * - averageReward unterscheidet sich vor/nach den Updates.
   * - preferences[a] != 0 nach Updates.
   */
  it("updates preferences and average reward", () => {
    const resultSuccess: iPullResult = { action: 0, reward: 1, isOptimal: true };
    const resultFail: iPullResult = { action: 1, reward: 0, isOptimal: false };

    policy.update(resultSuccess);

    const avgAfterSuccess = (policy as any).averageReward;
    const prefAfterSuccess = (policy as any).preferences[0];

    policy.update(resultFail);

    const avgAfterFail = (policy as any).averageReward;
    const prefAfterFail = (policy as any).preferences[1];

    expect(avgAfterFail).not.toBe(avgAfterSuccess);
    expect(prefAfterSuccess).not.toBe(0);
    expect(prefAfterFail).not.toBe(0);
  });

  /**
   * Test: Reset setzt Zustand auf Initialwerte zurück.
   * Erwartung:
   * - Alle Präferenzen auf 0.
   * - averageReward = 0.
   * - Zählungen N[a] = 0.
   */
  it("resets state correctly", () => {
    policy.update({ action: 0, reward: 1, isOptimal: true });
    policy.reset();

    expect((policy as any).preferences.every((v: number) => v === 0)).toBe(true);
    expect((policy as any).averageReward).toBe(0);
    expect(policy.getCounts().every((v) => v === 0)).toBe(true);
  });
});
