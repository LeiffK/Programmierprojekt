import type { iEnvConfig } from "./iEnvConfig"; // import type statt nur import, da interfaces keine Werte besitzen und deshalb zur Laufzeit nicht mit kompiliert werden (Beschreiben ja nur Struktur)
import type { iPullResult } from "./iPullResult";

export interface iBanditEnv {
  config: iEnvConfig;
  optimalAction: number;
  pull(action: number): iPullResult; // Methode, um Belohnung für Aktion zu simulieren
}
