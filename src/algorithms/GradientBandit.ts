import type { iPullResult } from "../env/Domain/iPullResult";
import type { iBanditEnv } from "../env/Domain/iBanditEnv";
import { BasePolicy } from "./BasePolicy.ts";

/**
 * Gradient Bandit Algorithmus.
 * Lernt numerische Präferenzen pro Arm und wählt Aktionen über Softmax-Policy.
 *
 * Besonderheit:
 * - Nutzt eine policy-basierte Methode (statt Wertschätzung Q).
 * - Hält "preferences" für jeden Arm, die in Wahrscheinlichkeiten umgerechnet werden.
 * - Nutzt das inkrementelle Mittel der Rewards als Base-Line.
 */
export class GradientBandit extends BasePolicy {
  protected preferences: number[] = []; // Präferenzen der Arme (werden via Softmax in Wahrscheinlichkeiten übersetzt)
  protected averageReward: number = 0; // Durchschnittlicher Reward als Baseline für Updates

  /**
   * Konstruktor der Policy.
   * Optionaler Parameter alpha = Lernrate (Schrittweite für Präferenzupdate).
   * Optional: seed für Zufallszahlengenerator.
   */
  constructor(protected cfg: { alpha?: number; seed?: number } = {}) {
    super(cfg);
  }

  /**
   * Initialisierung der Policy mit Environment-Daten.
   * Präferenzen und Baseline auf 0 setzen.
   */
  override initialize(env: iBanditEnv): void {
    super.initialize(env);
    this.preferences = new Array(this.nArms).fill(0);
    this.averageReward = 0;
  }

  /**
   * Setzt Policy komplett zurück auf Anfangszustand.
   * Präferenzen und Baseline-Reward = 0.
   */
  override reset(): void {
    super.reset();
    this.preferences.fill(0);
    this.averageReward = 0;
  }

  /**
   * Update der Präferenzen nach Gradient Bandit Formel.
   * - Berechnet inkrementellen Durchschnittsreward als Baseline.
   * - Erhöht Präferenz des gewählten Arms proportional zu (reward - baseline).
   * - Senkt gleichzeitig Präferenzen der nicht-gewählten Arme.
   *
   * Formel:
   * H_a(t+1) = H_a(t) + α * (R - baseline) * (1 - π_a)   falls Arm gewählt
   * H_a(t+1) = H_a(t) - α * (R - baseline) * π_a         sonst
   */
  override update(result: iPullResult): void {
    const alpha = this.cfg.alpha ?? 0.1; // Schrittweite (default: 0.1)
    super.update(result); // Q und N Updates der Basisklasse
    this.averageReward += (result.reward - this.averageReward) / this.t; // inkrementelles Mittel

    const action = result.action;
    const pi = this.getActionProbabilities(); // Aktuelle Aktionswahrscheinlichkeiten

    for (let a = 0; a < this.nArms; a++) {
      const baseline = this.averageReward;
      if (a === action) {
        this.preferences[a] += alpha * (result.reward - baseline) * (1 - pi[a]);
      } else {
        this.preferences[a] -= alpha * (result.reward - baseline) * pi[a];
      }
    }
  }

  /**
   * Auswahl einer Aktion entsprechend Softmax-Wahrscheinlichkeiten.
   * - Ziehen von Zufallszahl r
   * - Aktionen kumulativ summieren, bis r überschritten wird
   */
  override selectAction(): number {
    const probs = this.getActionProbabilities();
    const r = this.rng();
    let cumulative = 0;
    for (let i = 0; i < probs.length; i++) {
      cumulative += probs[i];
      if (r < cumulative) {
        return i;
      }
    }
    // Fallback (sollte praktisch nicht vorkommen, nur Rundungsabsicherung)
    return this.nArms - 1;
  }

  /**
   * Berechnet Softmax-Wahrscheinlichkeiten aus Präferenzen.
   * Trick: Subtrahiere maxPref für numerische Stabilität.
   *
   * π_a = exp(H_a - maxPref) / Σ exp(H_b - maxPref)
   */
  private getActionProbabilities(): number[] {
    const maxPref = Math.max(...this.preferences);
    const expPrefs = this.preferences.map((p) => Math.exp(p - maxPref));
    const sumExp = expPrefs.reduce((a, b) => a + b, 0);
    return expPrefs.map((val) => val / sumExp);
  }

  /** Getter für Tests und Zugriff */
  public getPreferences(): number[] {
    return this.preferences;
  }

  public getAverageReward(): number {
    return this.averageReward;
  }
}
