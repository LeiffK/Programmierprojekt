import type { iPullResult } from "../env/Domain/iPullResult.ts";
import type { iBanditEnv } from "../env/Domain/iBanditEnv.ts";
import { BasePolicy } from "./BasePolicy.ts";

/**
 * Upper Confidence Bound Algorithmus (UCB1).
 *
 * Prinzip:
 * - Wählt den Arm mit höchstem UCB-Wert:
 *   UCB_a(t) = Q[a] + c * sqrt(log(t) / N[a])
 *
 * - Q[a]: Durchschnittlicher Reward des Arms a
 * - N[a]: Anzahl Ziehungen des Arms a
 * - t: Gesamtanzahl aller Züge
 * - c: Exploration-Parameter (Standard 1.0)
 *
 * Initialisiert bevorzugt noch nicht gezogene Arme, um Exploration zu sichern.
 */
export class UpperConfidenceBound extends BasePolicy {
  private c: number;

  /**
   * @param cfg.confidence Parameter zur Skalierung des Konfidenzterms
   * @param cfg.seed Optionaler Seed für deterministische Zufallsauswahl (Basis)
   */
  constructor(cfg: { seed?: string | number; confidence?: number } = {}) {
    super(cfg);
    this.c = cfg.confidence ?? 1.0;
  }

  /**
   * Auswahl des Arms mit maximalem UCB-Wert.
   * Noch nie gewählte Arme werden zuerst gespielt.
   */
  override selectAction(): number {
    this.t += 1; // Gesamtanzahl Züge erhöhen

    // Priorisiere Arme, die noch nie ausgespielt wurden
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

    // Wähle den Arm mit dem höchsten UCB-Wert (bei Gleichstand Zufallstiebreak)
    return this.argmax(ucbValues);
  }

  /**
   * Update wie in BasePolicy implementiert (inkrementelles Mittel).
   * Hier nur überschrieben zur Klarheit.
   */
  override update(result: iPullResult): void {
    super.update(result);
  }

  /**
   * Hilfsfunktion: Index der größten Werte mit Zufallstiebreak bei Gleichstand.
   */
  private argmax(values: number[]): number {
    let best = -Infinity;
    let candidates: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (v > best) {
        best = v;
        candidates = [i];
      } else if (v === best) {
        candidates.push(i);
      }
    }
    const idx = Math.floor(this.rng() * candidates.length);
    return candidates[idx];
  }
}
