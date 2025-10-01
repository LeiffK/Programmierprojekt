// Diese Klasse wird später in die einzelnen Algortihmen rein
import seedrandom from "seedrandom";
import type { iBanditPolicyConfig } from "./Domain/iBanditPolicyConfig";
import type { iBanditPolicy } from "./Domain/iBanditPolicy";
import type { iBanditEnv } from "../env/Domain/iBanditEnv";
import type { iPullResult } from "../env/Domain/iPullResult";
import { updateMean } from "../utils/updateMean.ts";

export abstract class BasePolicy implements iBanditPolicy {
  protected nArms = 0;
  protected t = 0;               // gesamt Steps
  protected Q: number[] = [];    // Schätzungen je Arm
  protected N: number[] = [];    // Zählungen je Arm
  protected rng: () => number;

  constructor(protected cfg: iBanditPolicyConfig = {}) {
    this.rng = seedrandom(String(cfg.seed ?? "policy"));// der Seed, welcher in der Configuartion steht wird
  }

  initialize(env: iBanditEnv): void {
    this.nArms = env.config.arms; //wie viele arme haben wir 
    this.Q = Array(this.nArms).fill(0); //was glauben wir, wie hoch ist die Erfolgschance
    this.N = Array(this.nArms).fill(0); //wie oft wurde gezogen
    this.t = 0; //wie oft wurde insgesamt schon gezogen
  } // Erstmal alles auf 0 setzen

  reset(): void {
    this.Q.fill(0); //alle Werte auf Anfang
    this.N.fill(0);
    this.t = 0;
  }

  /** Default-Update: inkrementelles Mittel */
  update(result: iPullResult): void {
    const a = result.action; //Der Arm, welchen wir gewählt haben
    this.N[a] += 1; //da zählen wir einmal hoch, dass wir ihn ausgewählt haben
    const n = this.N[a]; //
    this.Q[a] = updateMean(this.Q[a],result.reward,this.N[a]) // den erwarteten Wert anpassen. 
    this.t += 1; // gesamt steps hochzählen
  }

  getEstimates(): readonly number[] {
    return this.Q; //Selbsterklärend
  }

  getCounts(): readonly number[] {
    return this.N; //Selbsterklärend
  }

  
  abstract selectAction(): number; //Da steckt ja die Logik der einzelnen Algorithmen drin--> Muss in den Kindklassen implementiert werden

  getInfo(): { name: string; params: Record<string, unknown> } {
    return { name: this.constructor.name, params: { ...this.cfg } };//spuck einmal alles aus, was du als Parameter für den Algrothmus gesetzt hast
  }

  /** Hilfsfunktion: Zufalls-Tiebreak
   * Exeption Handeling raaaar raar, das muss jetzt mindestens nh 1 für den Effort geben, weil der Case zu 99% niemals eintreten wird. Raaarrr 
   * **Hier Fleißsternchen einfügen**
   */
  protected tiebreak(values: number[]): number {//Übergeben werden alle möglichen, welche gezogen werden (also später alle möglichen Arme, welche gleiche Prob oder Mean haben)
    let best = -Infinity; //der kleinst mögliche Wert, damit jeder gezogene Wert garantiert größer ist
    let candidates: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (v > best) {
        best = v; //neuer bester Wert gefunden
        candidates = [i]; 
      } else if (v === best) { // wenn aktueller wert genauso gut ist füge ihn zu Kandidaten hinzu
        candidates.push(i);
      }
    }
    const idx = Math.floor(this.rng() * candidates.length); // zufällig den "besten" auswählen, Math.floor rundet die aktuelle Zahl immer AB
    return candidates[idx];
  }

  /** Hilfsfunktion: Zufallsarm
   * Ist halt wichtig weil Anfangs ja meistens mehr oder weniger Zufällig ein Arm ausgewählt wird
   */
  protected randomArm(): number {
    return Math.floor(this.rng() * this.nArms);
  }
}
