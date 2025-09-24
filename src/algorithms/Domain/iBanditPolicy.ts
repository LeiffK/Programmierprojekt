import type { iBanditEnv } from "../../env/Domain/iBanditEnv";
import { iPullResult } from "../../env/Domain/iPullResult";

/** Das haben basically alle Algorithmen */
export interface iBanditPolicy {
  
  initialize(env: iBanditEnv): void; //Dat is nh Funktion, welche einmal die Arme und co initalisiert (std. Abweichung, mean, prob. setzten)
  selectAction(): number; // Die eigentliche Logik des Algorithmusses: Welchen Arm soll ich nehmen
  update(result: iPullResult): void; //Das Ergebnis des Arms wegspeichern
  reset(): void; //Setzt alles zurück, was wir bis jetzt darin "gespielt" hatten
  getEstimates(): readonly number[]; // Liest aus wie hoch der Algorithmus die Wahrscheinlichkeit bzw den Mean einschätzt
  getCounts(): readonly number[];    // Liest aus wie oft Arm XY schon gezogen wurde
  getInfo(): { name: string; params: Record<string, unknown> }; //Ist nur wichtig fürs "Frontend", damit dann leichter darstellen kann, was für einen Algortihmus, mit welchen Werten wir jetzt genommen haben 
}