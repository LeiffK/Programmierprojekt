import type { iPullResult } from "../env/Domain/iPullResult.ts";
import type { iBanditEnv } from "../env/Domain/iBanditEnv.ts";
import { randNormal } from "../utils/randNormal.ts";
import { BasePolicy } from "./BasePolicy.ts";
import type { iBanditPolicyConfig } from "./Domain/iBanditPolicyConfig.ts";

export interface ThompsonBernoulliConfig extends iBanditPolicyConfig {
  alpha?: number;
  beta?: number;
}

/**
 * Thompson Sampling für Bernoulli-Banditen.
 *
 * Grundidee:
 * - Jeder Arm wird durch eine Beta-Verteilung Beta(α, β) modelliert.
 * - Erfolgreiche Ziehungen erhöhen α (successes), Misserfolge erhöhen β (failures).
 * - In jedem Schritt wird aus jeder Beta-Verteilung eine Zufallszahl gezogen.
 * - Arm mit höchstem Stichprobenwert wird gewählt.
 *
 * Vorteile:
 * - Balanciert Exploration und Exploitation probabilistisch.
 * - Passt sich dynamisch an Beobachtungen an.
 */
export class ThompsonSamplingBernoulli extends BasePolicy {
  private alpha0: number;
  private beta0: number;
  protected successes: number[] = []; // α-Parameter: Erfolgszählungen je Arm
  protected failures: number[] = []; // β-Parameter: Misserfolgszählungen je Arm

  constructor(cfg: ThompsonBernoulliConfig = {}) {
    super(cfg);
    this.alpha0 = cfg.alpha ?? 1;
    this.beta0 = cfg.beta ?? 1;
  }

  /**
   * Initialisierung der Policy mit Environment.
   * Setzt alle Arme auf Startwerte α=1, β=1 (uniforme Beta-Verteilung).
   */
  override initialize(env: iBanditEnv): void {
    super.initialize(env);
    const n = this.nArms;
    this.successes = new Array(n).fill(this.alpha0);
    this.failures = new Array(n).fill(this.beta0);
  }

  /**
   * Setzt interne Zählungen zurück auf Startwerte.
   */
  override reset(): void {
    super.reset();
    this.successes.fill(this.alpha0);
    this.failures.fill(this.beta0);
  }

  /**
   * Auswahl einer Aktion durch Ziehen aus Beta-Verteilungen.
   * Arm mit höchstem Wert wird gewählt.
   */
  override selectAction(): number {
    const samples = this.successes.map((s, i) => {
      const f = this.failures[i];
      return this.sampleBeta(s, f);
    });
    return this.tiebreak(samples);
  }

  /**
   * Update der Zählungen (successes/failures) je nach Reward.
   */
  override update(result: iPullResult): void {
    super.update(result); // Basis-Update (Q, N, t)
    const a = result.action;
    if (result.reward === 1) {
      this.successes[a]++;
    } else {
      this.failures[a]++;
    }
  }

  /**
   * Hilfsfunktion: Stichprobe aus Beta-Verteilung mit Parametern α, β.
   * Nutzt inversen Transformations-Sampling via Gamma-Verteilungen.
   */
  private sampleBeta(alpha: number, beta: number): number {
    // Beide Gamma-Verteilungen ziehen:
    const x = this.sampleGamma(alpha, 1);
    const y = this.sampleGamma(beta, 1);
    return x / (x + y);
  }

  /**
   * Hilfsfunktion: Stichprobe aus Gamma-Verteilung (shape k, scale theta).
   * Nutzt Marsaglia & Tsang Methode für k>1, verschiedene Fälle abgedeckt.
   */
  private sampleGamma(shape: number, scale: number): number {
    if (shape < 1) {
      // Johnk's generator für shape < 1
      const c = 1 / shape;
      let d = (1 - shape) * Math.pow(shape, shape / (1 - shape));
      while (true) {
        const u = this.rng();
        const v = this.rng();
        const x = Math.pow(u, c);
        const y = Math.pow(v, 1 / (1 - shape));
        if (x + y <= 1) {
          return ((-Math.log(this.rng()) * x) / (x + y)) * scale;
        }
      }
    } else {
      // Marsaglia & Tsang 2000 für shape >= 1
      const d = shape - 1 / 3;
      const c = 1 / Math.sqrt(9 * d);
      while (true) {
        let x = 0;
        let v = 0;
        do {
          x = randNormal(this.rng);
          v = 1 + c * x;
        } while (v <= 0);
        v = v * v * v;
        const u = this.rng();
        if (u < 1 - 0.0331 * x * x * x * x) return d * v * scale;
        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v)))
          return d * v * scale;
      }
    }
  }

  /** Getter für Tests */
  public getSuccesses(): number[] {
    return this.successes;
  }

  public getFailures(): number[] {
    return this.failures;
  }
}
