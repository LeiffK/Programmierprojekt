/**
 * Bernoulli-Reward basierend auf Erfolgswahrscheinlichkeit p.
 *
 * @param rng - Zufallszahlengenerator (0..1)
 * @param p - Erfolgswahrscheinlichkeit für Reward = 1
 * @returns 1 bei Erfolg, 0 bei Misserfolg
 */
export function randBernoulli(rng: () => number, p: number): 0 | 1 {
  return rng() < p ? 1 : 0;
}
