export interface iBanditAlgorithm {
  name: string; // Name des Algorithmus, z.B. "Greedy"
  selectAction(): number; // Methode zur Auswahl des nächsten Arms (Aktion)
  update(action: number, reward: number): void; // Methode zur Aktualisierung des internen Zustands nach Beobachtung einer Belohnung
  reset?(arms: number): void; // optionale Methode zum Zurücksetzen des Algorithmus mit gegebener Anzahl Arme
}
