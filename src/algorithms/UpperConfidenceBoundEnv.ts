import type { iPullResult } from "../env/Domain/iPullResult";
import type { iBanditEnv } from "../env/Domain/iBanditEnv";
import { BasePolicy } from "./BasePolicy";

/**
 * Upper Confidence Bound Algorithmus (UCB1).
 *
 * Grundidee:
 * - Wählt in jeder Runde den Arm mit der höchsten oberen Vertrauensgrenze (UCB).
 * - UCB balanciert Exploration und Exploitation dadurch, dass zu jedem
 *   geschätzten Mittelwert Q[a] noch ein Konfidenzterm addiert wird:
 *
 *   UCB_a(t) = Q[a] + c * sqrt( log(t) / N[a] )
 *
 *   Q[a]  = geschätzter Mittelwert Rewards für Arm a
 *   N[a]  = Anzahl Ziehungen von Arm a
 *   t     = Gesamtanzahl Züge (alle Arme)
 *   c     = Parameter (Gewichtung Exploration)
 *
 * - Effekt: selten gespielte Arme erhalten einen großen Konfidenzbonus,
 *   wodurch Exploration garantiert ist.
 */
export class UpperConfidenceBound extends BasePolicy {
  private c: number; // Parameter für die Stärke der Exploration (default = 1.0)

  /**
   * Konstruktor.
   * - cfg.seed    : optional für deterministische Zufallsauswahl (vererbt).
   * - cfg.confidence: Skaliert die Größe des UCB-Konfidenzterms.
   */
  constructor(cfg: { seed?: string | number; confidence?: number } = {}) {
    super(cfg);
    this.c = cfg.confidence ?? 1.0; // Default: 1.0
  }

  /**
   * Auswahl der Aktion mit maximalem UCB-Wert.
   * Ablauf:
   * 1. Falls ein Arm noch nie gewählt wurde -> wähle ihn sofort (Exploration).
   * 2. Ansonsten berechne für jeden Arm:
   *      UCB_a = Q[a] + c * sqrt( log(t) / N[a] )
   * 3. Der Arm mit höchstem UCB-Wert wird ausgewählt.
   */
  override selectAction(): number {
    this.t += 1; // Zeitschritt erhöhen (wie oft insgesamt gewählt wurde)

    // Schritt 1: unerforschte Arme zuerst mindestens einmal spielen
    for (let a = 0; a < this.nArms; a++) {
      if (this.N[a] === 0) {
        return a;
      }
    }

    // Schritt 2: Berechne UCB-Werte für alle Arme
    const ucbValues = this.Q.map((meanReward, a) => {
      const confidence = this.c * Math.sqrt(Math.log(this.t) / this.N[a]);
      return meanReward + confidence;
    });

    // Schritt 3: Wähle Arm mit dem größten UCB-Wert
    return this.argmax(ucbValues);
  }

  /**
   * Update-Regel wie in BasePolicy implementiert (inkrementelles Mittel).
   * Q[a] und N[a] werden automatisch aktualisiert, daher kein Override nötig.
   * Wird hier explizit überschrieben für Lesbarkeit und Nachvollziehbarkeit.
   */
  override update(result: iPullResult): void {
    super.update(result);
  }
}
