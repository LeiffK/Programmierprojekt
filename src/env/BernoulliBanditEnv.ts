import type { iEnvConfig } from "./Domain/iEnvConfig";
import type { iPullResult } from "./Domain/iPullResult";
import { BanditEnv } from "./BanditEnv.ts";

export function generateProbabilities(
  k: number,
  rng: () => number,
  cfg: { min?: number; max?: number; bestBonus?: number } = {},
): number[] {
  const min = cfg.min ?? 0.05;
  const max = cfg.max ?? 0.6;
  const span = max - min;
  const bestBonus = cfg.bestBonus ?? 0.25;

  const out = Array.from({ length: k }, () => {
    const raw = min + rng() * span;
    return Number(raw.toFixed(4));
  });

  const bestIdx = Math.floor(rng() * k);
  const maxOther = Math.max(...out.filter((_, idx) => idx !== bestIdx), 0);
  const ensuredBest = Math.min(
    0.99,
    Math.max(out[bestIdx], maxOther + bestBonus, 0.26),
  );
  out[bestIdx] = Number(ensuredBest.toFixed(4));

  for (let i = 0; i < out.length; i++) {
    if (i === bestIdx) continue;
    const capped = Math.min(out[i], out[bestIdx] - 0.25);
    out[i] = Number(Math.max(capped, 0.01).toFixed(4));
  }

  return out.map((p) => Math.min(Math.max(p, 0.01), 0.99));
}

export function randBernoulli(rng: () => number, p: number): 0 | 1 {
  return rng() < p ? 1 : 0;
}

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
        Number.isFinite(p) ? Math.min(Math.max(p, 0), 1) : 0,
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
