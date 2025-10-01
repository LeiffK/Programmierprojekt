import { describe, it, expect, beforeEach } from "vitest";
import type { iEnvConfig } from "../../env/Domain/iEnvConfig";
import type { iBanditEnv } from "../../env/Domain/iBanditEnv";
import type { iPullResult } from "../../env/Domain/iPullResult";
import { ThompsonSamplingBernoulli } from "../ThompsonSamplingBernoulli";

/**
 * Mock-Umgebung (Bernoulli) für Tests der ThompsonSampling Policy.
 * - Simuliert Rewards basierend auf festen Erfolgswahrscheinlichkeiten.
 * - Einfachheit: rng nutzt Math.random(), Seed wird hier ignoriert.
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
    this.rng = () => Math.random();
  }

  pull(action: number): iPullResult {
    const p = this.probs[action];
    const reward = this.rng() < p ? 1 : 0;
    return { action, reward, isOptimal: action === this.optimalAction };
  }
}

/**
 * Test-Suite für ThompsonSamplingBernoulli Policy.
 *
 * Geprüfte Aspekte:
 * - Gewählte Aktionen liegen immer im gültigen Bereich.
 * - Update-Prozess verändert α/β-Parameter (successes/failures).
 * - Reset setzt internen Zustand korrekt auf Anfangswerte zurück.
 */
describe("ThompsonSamplingBernoulli", () => {
  let env: MockBernoulliEnv;
  let policy: ThompsonSamplingBernoulli;

  beforeEach(() => {
    // Environment mit 3 Armen: p=[0.9, 0.5, 0.3], optimaler Arm = 0
    env = new MockBernoulliEnv([0.9, 0.5, 0.3], 123);
    policy = new ThompsonSamplingBernoulli({ seed: 123 });
    policy.initialize(env);
  });

  /**
   * Test: Policy wählt nur gültige Arme.
   * Erwartung:
   * - Alle Rückgabewerte von selectAction liegen im Bereich [0, arms).
   * - Auch nach vielen Iterationen bleiben Auswahl und Update konsistent.
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
   * Test: Update verändert Erfolge und Fehlschläge pro Arm.
   * Ablauf:
   * - Zuerst ein Erfolg auf Arm 0 → successes[0] steigt.
   * - Dann ein Misserfolg auf Arm 1 → failures[1] steigt.
   */
  it("updates successes and failures correctly", () => {
    const resultSuccess: iPullResult = { action: 0, reward: 1, isOptimal: true };
    const resultFail: iPullResult = { action: 1, reward: 0, isOptimal: false };

    policy.update(resultSuccess);
    const succAfter = (policy as any).successes[0];

    policy.update(resultFail);
    const failAfter = (policy as any).failures[1];

    expect(succAfter).toBeGreaterThan(0);
    expect(failAfter).toBeGreaterThan(0);
  });

  /**
   * Test: Reset setzt internen Zustand zurück.
   * Erwartung:
   * - successes => überall 0
   * - failures  => überall 0
   * - Counts N[a] => überall 0
   */
  it("resets state correctly", () => {
    policy.update({ action: 0, reward: 1, isOptimal: true });
    policy.update({ action: 1, reward: 0, isOptimal: false });

    policy.reset();

    expect((policy as any).successes.every((s: number) => s === 0)).toBe(true);
    expect((policy as any).failures.every((f: number) => f === 0)).toBe(true);
    expect(policy.getCounts().every((n) => n === 0)).toBe(true);
  });
});
