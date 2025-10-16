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
  const out = Array.from({ length: k }, () =>
    Number((min + rng() * span).toFixed(4)),
  );

  // Einen "besten" Arm auswählen und Bonus darauf anwenden
  const bestIdx = Math.floor(rng() * k);
  out[bestIdx] = Number(Math.min(0.99, out[bestIdx] + bestBonus).toFixed(4));

  // Alle Wahrscheinlichkeiten auf gültigen Bereich [0.01, 0.99] trimmen
  return out.map((p) => Math.min(Math.max(p, 0.01), 0.99));
}
