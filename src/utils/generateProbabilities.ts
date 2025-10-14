/**
 * Generiert Erfolgswahrscheinlichkeiten mit kontrolliertem Bereich.
 * @param k Anzahl Arme
 * @param options.min Minimalwert (default 0.05)
 * @param options.max Maximalwert (default 0.6)
 * @param options.bestBonus Bonus für besten Arm (default 0.25)
 * @param rng Zufallsfunktion (0-1)
 * @returns Array von Wahrscheinlichkeiten
 */
export function generateProbabilities(
  k: number,
  rng: () => number,
  options?: { min?: number; max?: number; bestBonus?: number }
): number[] {
  const min = options?.min ?? 0.05;
  const max = options?.max ?? 0.6;
  const bestBonus = options?.bestBonus ?? 0.25;

  if (min >= max) {
    throw new Error(`min (${min}) must be less than max (${max})`);
  }

  const span = max - min;
  const out = Array.from({ length: k }, () =>
    Number((min + rng() * span).toFixed(4))
  );

  const bestIdx = Math.max(0, Math.min(k - 1, Math.floor(rng() * k)));
  out[bestIdx] = Number(Math.min(0.99, out[bestIdx] + bestBonus).toFixed(4));

  return out.map((p) => Math.min(Math.max(p, 0.01), 0.99));
}
