import type { iPullResult } from "../env/Domain/iPullResult";
import type { iBanditEnv } from "../env/Domain/iBanditEnv";
import { BasePolicy } from "./BasePolicy";

/**
 * Upper Confidence Bound Algorithmus (UCB1).
 * Wählt den Arm mit der höchsten oberen Vertrauensgrenze.
 * UCB balanciert Exploration und Exploitation mathematisch fundiert.
 */
export class UpperConfidenceBound extends BasePolicy {
  private c: number; // Parameter zur Gewichtung der Exploration

  constructor(cfg: { seed?: string | number; confidence?: number } = {}) {
    super(cfg);
    this.c = cfg.confidence ?? 1.0; // Default: 1.0
  }

  /**
   * Auswahl der Aktion mit maximalem UCB-Wert.
   * Jeder Arm wird zuerst mindestens einmal gewählt.
   */
  override selectAction(): number {
    this.t += 1; // Zeit-Schritt erhöhen

    // Wenn ein Arm noch nie gezogen wurde, wähle diesen zuerst
    for (let a = 0; a < this.nArms; a++) {
      if (this.N[a] === 0) {
        return a;
      }
    }

    // Berechne UCB-Werte für alle Arme
    const ucbValues = this.Q.map((meanReward, a) => {
      const confidence = this.c * Math.sqrt(Math.log(this.t) / this.N[a]);
      return meanReward + confidence;
    });

    // Wähle Arm mit maximalem UCB-Wert
    return this.argmax(ucbValues);
  }

  /**
   * Aktualisiere Schätzwerte basierend auf beobachtetem Ergebnis (Sample Average).
   */
  override update(result: iPullResult): void {
    super.update(result);
  }
}
