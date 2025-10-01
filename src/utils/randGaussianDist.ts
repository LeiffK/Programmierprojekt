//Diese Funktion gibt zufällige Mittelwerte und Standardabweichungen zurück, welche einigermaßen zueinadner passen.
export function randGaussianDist(
  rng: () => number,
  lowerBound: number = 0, //Lowerbound und upperbound wird übergeben, damit man Fallbeispiele behandeln kann--> also zb. bei slot sollten zum Beispiel nur positive Werte erzeugt werden
  upperBound: number = 300,
  standardDeviationFactor: number = 0.5,
) {
  const mean = rng() * (upperBound - lowerBound) + lowerBound; //Wähle einen Random Mittelwert zwischen lower und upper Bound zurück
  const standardDeviation =
    Math.abs(
      //Standardabweichung soll positiv sein
      rng() * (upperBound - lowerBound) + lowerBound - mean, //Wähle einen Mittelwert, bei welchem die meisten werte mehr oder weniger im Upperbound oder Lowerbound bleiben
    ) * standardDeviationFactor; //Damit kann man nen wenig steuer wie weit die Verteilung "streut"
  return { mean, standardDeviation };
}
