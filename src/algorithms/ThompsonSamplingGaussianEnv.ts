import type { iPullResult } from "../env/Domain/iPullResult";
import type { iBanditEnv } from "../env/Domain/iBanditEnv";
import { BasePolicy } from "./BasePolicy";

/**
 * Thompson Sampling für Gaussian-Banditen.
 *
 * Grundidee:
 * - Jeder Arm wird als Normalverteilung modelliert.
 * - Prior: Normalverteilung mit gegebenem Mittelwert (0) und Varianz (konfigurierbar).
 * - Beobachtungen (Rewards) sind Gauss-verteilt mit Varianz=1.
 * - Posterior bleibt damit ebenfalls Normalverteilung (konjugiert).
 *
 * Mathematisch:
 *  mean_new      = (precision_old * mean_old + reward) / (precision_old + 1)
 *  precision_new = precision_old + 1
 *
 * -> Mittelwert und Präzision werden iterativ angepasst.
 * -> Bei Auswahl: Aus jeder Posterior-Normalverteilung wird eine Stichprobe gezogen.
 * -> Arm mit höchstem Sample wird gewählt.
 */
export class ThompsonSamplingGaussian extends BasePolicy {
  private means: number[] = [];       // Posterior-Mittelwerte je Arm
  private precisions: number[] = [];  // Posterior-Präzision = 1 / Varianz je Arm
  private priorVariance: number;      // Anfangsvarianz für Priors

  /**
   * Konstruktor.
   * - optionales priorVariance (Default 1) bestimmt die Unsicherheit der Priors.
   * - seed optional für deterministische Zufallszahlen.
   */
  constructor(cfg: { seed?: number; priorVariance?: number } = {}) {
    super(cfg);
    this.priorVariance = cfg.priorVariance ?? 1;
  }

  /**
   * Initialisierung mit Environment.
   * - Startwerte für means: aus Q (BasePolicy, init = 0)
   * - Startpräzision: 1 / priorVariance (geringe Sicherheit bei großem priorVariance).
   */
  override initialize(env: iBanditEnv): void {
    super.initialize(env);
    this.means = this.Q.slice();
    this.precisions = new Array(this.nArms).fill(1 / this.priorVariance);
  }

  /**
   * Zurücksetzen auf Anfangszustand.
   * - Mittelwerte aller Arme auf 0.
   * - Präzision aller Arme = 1 / priorVariance.
   */
  override reset(): void {
    super.reset();
    this.means.fill(0);
    this.precisions.fill(1 / this.priorVariance);
  }

  /**
   * Update der Posteriorverteilungen nach einer Beobachtung.
   * - Reward wird als neue Datenpunkterfahrung eingerechnet.
   * - Posterior-Update entspricht Bayes für Normal-Normal Modell:
   *   precision_new = precision_old + 1
   *   mean_new = (precision_old * mean_old + reward) / precision_new
   *
   * Aktualisiert posterior mean + precision und spiegelt Schätzung auch in Q wider.
   */
  override update(result: iPullResult): void {
    super.update(result);

    const a = result.action;
    const reward = result.reward;

    const priorPrecision = this.precisions[a];
    const oldMean = this.means[a];

    // Update nach einer neuen Beobachtung (reward)
    const precisionNew = priorPrecision + 1;
    const meanNew = (priorPrecision * oldMean + reward) / precisionNew;

    this.precisions[a] = precisionNew;
    this.means[a] = meanNew;

    // Q-Schätzung im BasePolicy-Kontext aktualisieren
    this.Q[a] = meanNew;
  }

  /**
   * Auswahl einer Aktion mittels Posterior-Sampling.
   * - Für jeden Arm Beta(α,β) Äquivalent: N(mean, variance).
   * - Ziehe eine Stichprobe aus Normal(mean, variance).
   * - Wähle den Arm mit dem größten gezogenen Wert.
   */
  override selectAction(): number {
    const samples = this.means.map((mean, i) => {
      const variance = 1 / this.precisions[i];
      return this.normalSample(mean, Math.sqrt(variance));
    });
    return this.argmax(samples);
  }

  /**
   * Stichprobe aus Normal(mean, stdDev).
   * Implementiert via Box-Muller Transformation für N(0,1),
   * dann skaliert auf gewünschte Parameter.
   */
  private normalSample(mean: number, stdDev: number): number {
    let u1 = 0, u2 = 0;
    // u1 darf nicht 0 sein wegen log()
    while (u1 === 0) u1 = this.rng();
    u2 = this.rng();

    // Box-Muller Transformation
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    return mean + z0 * stdDev;
  }
}
