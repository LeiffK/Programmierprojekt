import type { iEnvConfig } from "./Domain/iEnvConfig";
import type { iPullResult } from "./Domain/iPullResult";
import { BanditEnv } from "./BanditEnv.ts";
import { randBernoulli } from "../utils/randBernoulli.ts";
import { generateProbabilities } from "../utils/generateProbabilities.ts";

/**
 * Bernoulli-Bandit-Umgebung
 * 
 * Diese Environment-Klasse definiert eine Bernoulli-Multi-Armed-Bandit-Umgebung,
 * bei der jeder Arm eine Gewinnwahrscheinlichkeit p hat.
 *
 * Design-Korrektur:
 * - Zufällige Parameter (p_i) werden nicht mehr intern unkontrolliert erzeugt.
 * - Parameterbereiche sind konfigurierbar (minProb, maxProb, bestBonus).
 * - deterministische Reproduzierbarkeit über RNG aus `BanditEnv`.
 */
export class BernoulliBanditEnv extends BanditEnv {
  // interne Wahrscheinlichkeiten der Arme
  private readonly probs: number[];

  constructor(config: iEnvConfig) {
    super(config);

    // Typprüfung – zur Laufzeit frühes Abfangen von Fehlkonfigurationen
    if (config.type !== "bernoulli") {
      throw new Error(`BernoulliBanditEnv expects type to be "bernoulli".`);
    }

    // Sicherstellen, dass sinnvolle Wahrscheinlichkeiten existieren
    let probs = config.probs;

    // Falls keine expliziten Wahrscheinlichkeiten angegeben sind → generieren
    if (!Array.isArray(probs) || probs.length !== config.arms) {
      probs = generateProbabilities(config.arms, this.rng, {
        min: config.minProb,
        max: config.maxProb,
        bestBonus: config.bestBonus,
      });
    } else {
      // Sicherstellung, dass jede Wahrscheinlichkeit im Intervall [0,1] liegt
      probs = probs.map((p) =>
        Number.isFinite(p) ? Math.min(Math.max(p, 0), 1) : 0
      );
    }

    // Wahrscheinlichkeiten speichern
    this.probs = probs;

    // Konfigurationsobjekt für Nachvollziehbarkeit aktualisieren
    this.config.probs = [...probs];

    // Index des "besten Arms" bestimmen (höchste Gewinnwahrscheinlichkeit)
    const bestP = Math.max(...probs);
    this.optimalAction = probs.indexOf(bestP);
  }

  /**
   * Simuliert das Ziehen eines Arms.
   * Gibt Reward 1 (Erfolg) oder 0 (Misserfolg) basierend auf p zurück.
   */
  pull(action: number): iPullResult {
    const p = this.probs[action];
    const reward = randBernoulli(this.rng, p);

    return {
      action,
      reward,
      isOptimal: action === this.optimalAction,
    };
  }

  /**
   * Zugriffsmethode für Tests und Debugging:
   * Gibt eine Kopie der Arm-Wahrscheinlichkeiten zurück.
   */
  public getProbs(): number[] {
    return [...this.probs];
  }
}
