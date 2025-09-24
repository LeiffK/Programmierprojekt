export interface iPullResult {
  action: number;       // welcher Arm gezogen wurde
  reward: number;       // Belohnung zurückgegeben (z.B. 0 oder 1 bei Bernoulli)
  isOptimal: boolean;   // ob Aktion optimaler Arm ist (für Auswertung)
}