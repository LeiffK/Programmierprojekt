//Diese Funktion passt den Mittelwert an

export function updateMean(
  legacyMean: number, //der alte Mittelwert
  result: number, // Welcher Wert nun miteinberechnet werden soll
  iteration: number, // wie viele werte sind in den alten Mittelwert eingeflossen
) {
  return (legacyMean * iteration + result) / (iteration + 1);
}
