import { describe, it, expect, beforeEach } from "vitest";
import type { iEnvConfig } from "../../env/Domain/iEnvConfig";
import type { iBanditEnv } from "../../env/Domain/iBanditEnv";
import type { iPullResult } from "../../env/Domain/iPullResult";
import { UpperConfidenceBound } from "../UpperConfidenceBound";

/**
 * Mock-Umgebung für Bernoulli-Banditen.
 * - Jeder Arm hat eine feste Erfolgswahrscheinlichkeit p.
 * - pull(action) liefert Reward = 1 (mit Wkeit p) oder 0.
 * - optimalAction = Arm mit größtem p.
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
 * Test-Suite für UpperConfidenceBound (UCB1).
 *
 * Geprüfte Aspekte:
 * - Jeder Arm wird in der Initialphase mindestens einmal gespielt.
 * - Armwahl bleibt danach valide und im richtigen Indexbereich.
 * - Update der geschätzten Mittelwerte funktioniert korrekt.
 */
describe("UpperConfidenceBound", () => {
  let env: MockBernoulliEnv;
  let policy: UpperConfidenceBound;

  beforeEach(() => {
    // Environment mit 3 Armen: p=[0.9, 0.5, 0.2], optimaler Arm = 0
    env = new MockBernoulliEnv([0.9, 0.5, 0.2], 123);

    // Policy mit Confidence-Parameter c=2 (stärkere Exploration)
    policy = new UpperConfidenceBound({ confidence: 2, seed: 123 });
    policy.initialize(env);
  });

  /**
   * Test: Initialphase – jeder Arm wird mindestens einmal gezogen.
   * Ablauf:
   * - selectAction wird so oft wie es Arme gibt aufgerufen.
   * - Erwartung: Jeder Arm taucht mind. einmal in der Menge der gewählten Arme auf.
   */
  it("selects valid arms including initial exploring each arm once", () => {
    const chosenArms = new Set();
    for (let i = 0; i < env.config.arms; i++) {
      const action = policy.selectAction();
      chosenArms.add(action);
      const result = env.pull(action);
      policy.update(result);
    }
    expect(chosenArms.size).toBe(env.config.arms);
  });

  /**
   * Test: Auswahl nach Initialphase.
   * Ablauf:
   * - Zunächst wird jeder Arm genau einmal gezogen.
   * - Danach werden weitere selectAction-Aufrufe durchgeführt.
   * Erwartung:
   * - Alle Rückgabewerte liegen im gültigen Bereich [0, arms).
   * - Updates verarbeiten Rewards korrekt, keine Fehler im Ablauf.
   */
  it("selects arms after initial phase", () => {
    // Initial: jeder Arm min. einmal spielen
    for (let i = 0; i < env.config.arms; i++) {
      const action = policy.selectAction();
      policy.update(env.pull(action));
    }
    // Folgeaufrufe
    for (let i = 0; i < 50; i++) {
      const action = policy.selectAction();
      expect(action).toBeGreaterThanOrEqual(0);
      expect(action).toBeLessThan(env.config.arms);

      const result = env.pull(action);
      policy.update(result);
    }
  });

  /**
   * Test: Update setzt Schätzwerte korrekt.
   * Ablauf:
   * - Wähle eine Aktion und führe Update durch.
   * Erwartung:
   * - getEstimates() gibt gültiges Array mit Länge = Anzahl Arme zurück.
   * - Schätzwert für den gezogenen Arm ist >= 0 (da Rewards ≥ 0).
   */
  it("updates estimated means correctly", () => {
    const action = policy.selectAction();
    const result = env.pull(action);
    policy.update(result);

    expect(policy.getEstimates().length).toBe(env.config.arms);
    expect(policy.getEstimates()[action]).toBeGreaterThanOrEqual(0);
  });
});
