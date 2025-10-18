/**
 * Utility-Funktion zur kontrollierten Generierung von Bernoulli-Wahrscheinlichkeiten.
 *
 * Hintergrund:
 * Ursprünglich generierten die Environments die Arm-Wahrscheinlichkeiten intern
 * zufällig, ohne konfigurierbare Grenzen oder deterministische Seeds.
 * Das führte zu unkontrolliertem Verhalten zwischen Läufen.
 *
 * Ziel dieser Funktion:
 * - Zufallsparameter zentralisieren
 * - Grenzen (min, max) und "Bonus" für den besten Arm konfigurierbar machen
 * - RNG (seeded) als Input entgegennehmen → deterministische Ergebnisse
 *
 * @param k Anzahl der Arme
 * @param rng Zufallszahlgenerator (z. B. Seeded-RNG aus BanditEnv)
 * @param cfg Optionale Grenzen: { min, max, bestBonus }
 * @returns Array von Wahrscheinlichkeiten innerhalb [0.01, 0.99]
 */
export function generateProbabilities(
  k: number,
  rng: () => number,
  cfg: { min?: number; max?: number; bestBonus?: number } = {},
): number[] {
  // Setze Grenzen (Standardwerte falls nicht übergeben)
  const min = cfg.min ?? 0.05;
  const max = cfg.max ?? 0.6;
  const span = max - min;
  const bestBonus = cfg.bestBonus ?? 0.25;

  // Basiswahrscheinlichkeiten generieren
  const out = Array.from({ length: k }, () => {
    const raw = min + rng() * span;
    return Number(raw.toFixed(4));
  });

  const bestIdx = Math.floor(rng() * k);
  const maxOther = Math.max(
    ...out.filter((_, idx) => idx !== bestIdx),
    0,
  );
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
