//Diese Funktion gibt einen Normalverteilten Wert zurück, Mittelwert und Standardabweichung müssen übergeben werden

export function randNormal(
  rng: () => number,
  mean: number = 0,
  stdDev: number = 1
): number {
  let u1 = 0, u2 = 0;

  // u1 darf nicht 0 sein (weil log(0) undefiniert ist)
  while (u1 === 0) u1 = rng(); // u1 zuständig für Radius
  u2 = rng(); //u2 zuständig für Winkel

  // Box–Muller-Transformation
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2); //Teil 1 der Formel zur Bestimmung der Länge der Hypotenuse/Radius, Teil 2 zur Bestimmung des Winkel des Dreiecks im Kreis.

  // Auf N(mean, stdDev^2) abbilden
  return mean + z0 * stdDev; //Box Muller Funktion gibt Werte Standard Normalverteilt zurück (also Mittelwert 0 & Standardabweichung =1)
}