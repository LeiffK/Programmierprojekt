import seedrandom from "seedrandom";
import type { iBanditPolicyConfig } from "./Domain/iBanditPolicyConfig";
import type { iBanditPolicy } from "./Domain/iBanditPolicy";
import type { iBanditEnv } from "../env/Domain/iBanditEnv";
import type { iPullResult } from "../env/Domain/iPullResult";

/**
 * Abstrakte Basisklasse für alle Bandit-Policies.
 * Implementiert gemeinsame Logik wie Zufallszahlengenerator,
 * Zählungen, Schätzungen, Initialisierung und Update.
 *
 * Neu: Unterstützung von Optimistic Initial Values durch Konfigurationsparameter.
 *       So können Anfangswerte der Aktionsschätzungen bewusst optimistisch gesetzt werden,
 *       um Exploration zu fördern.
 */
export abstract class BasePolicy implements iBanditPolicy {
  protected nArms = 0;
  protected t = 0; // gesamt Steps, wie oft Aktionen gewählt wurden
  protected Q: number[] = []; // Schätzungen je Arm (mittlere Belohnung)
  protected N: number[] = []; // Zählungen je Arm, wie oft gewählt
  protected rng!: () => number; // Zufallsfunktion für Tiebreaks und mehr
  protected cfg: iBanditPolicyConfig;
  /**
   * Konstruktor.
   * Initialisiert rng mit Seed aus Konfiguration oder Standardwert "policy".
   * Übergibt weitere optionale Parameter in cfg (u.a. optimisticInitialValue).
   */

  constructor(cfg: iBanditPolicyConfig = {}) {
    // kein Parameter-Property mehr
    this.cfg = cfg; // Zuweisung
  }

  /**
   * Initialisierung der Policy mit Angaben aus Environment.
   * Wichtig: Q wird hier auf optimistischen Startwert gefüllt (Standard 0).
   * N wird zurückgesetzt.
   * t wird auf 0 gesetzt.
   *
   * @param env - Umgebung mit Angaben zu Anzahl der Arme
   */
  initialize(env: iBanditEnv): void {
    this.nArms = env.config.arms; // Anzahl der Arme aus Environment-Konfig
    const optimisticValue = this.setOptimisticInitialValue();
    this.Q = Array(this.nArms).fill(optimisticValue); // optimistische Startwerte fördern Exploration
    this.N = Array(this.nArms).fill(0); // Zähler für Ziehungen je Arm
    this.t = 0; // Gesamtanzahl Ziehungen
    this.cfg.seed = env.config.seed;
    this.rng = seedrandom(String(this.cfg.seed));
    this.onInitialize(env);
  }
  protected setOptimisticInitialValue(): number {
    // Methode, damit in Greedy oder E Greedy der Startwert für die Arme leichter angepasst werden kann--> Ansonsten öfters Gefahr, dass Algo sich einfach auf einen Anfangsarm einigt
    return this.cfg.optimisticInitialValue ?? 0;
  }
  /**
   * Setzt Zustand zurück auf Initialwerte (wie bei initialize).
   * Q und N auf Startwerte (bzw. 0) setzen, t auf 0.
   */
  reset(): void {
    const optimisticValue = this.setOptimisticInitialValue();
    this.Q.fill(optimisticValue); // alle Q-Werte auf Anfang setzen (optimistisch)
    this.N.fill(0); // Zähler zurücksetzen
    this.t = 0; // Gesamtanzahl Steps zurücksetzen
    this.onReset();
  }

  /**
   * Default-Update der Schätzwerte (inkrementelles Mittel).
   * Nach Ziehung eines Arms werden Zähler erhöht und geschätzter Mittelwert angepasst.
   * Zusätzlich t (Gesamtanzahl Schritte) erhöht.
   *
   * @param result - Ergebnis eines Zuges (Arm, Reward)
   */
  update(result: iPullResult): void {
    const a = result.action; // Der gewählte Arm
    this.N[a] += 1; // Zähler des Arms erhöhen
    const n = this.N[a]; // Anzahl Ziehungen dieses Arms
    // Mittelwert-Update mit inkrementeller Form
    // this.Q[a] += (result.reward - this.Q[a]) / (n + 1);
    this.Q[a] += (result.reward - this.Q[a]) / n;

    //Alt
    // this.Q[a] += (result.reward - this.Q[a]) / n+1;
    this.t += 1; // Gesamtanzahl Schritte erhöhen
    this.onUpdate(result);
  }

  /**
   * Gibt aktuelle Schätzwerte (Q) zurück.
   */
  getEstimates(): readonly number[] {
    return this.Q;
  }

  /**
   * Gibt Anzahl der Ziehungen je Arm zurück.
   */
  getCounts(): readonly number[] {
    return this.N;
  }

  /**
   * Abstrakte Methode zur Aktionsauswahl.
   * Muss in Kindklassen implementiert werden.
   * Enthält die konkrete Logik des jeweiligen Bandit-Algorithmus.
   */
  abstract selectAction(): number;

  /**
   * Gibt Info über Policy und Konfiguration zurück.
   */
  getInfo(): { name: string; params: Record<string, unknown> } {
    return { name: this.constructor.name, params: { ...this.cfg } };
  }

  /** Hilfsfunktion: Zufalls-Tiebreak
   * Exeption Handeling raaaar raar, das muss jetzt mindestens nh 1 für den Effort geben, weil der Case zu 99% niemals eintreten wird. Raaarrr
   * **Hier Fleißsternchen einfügen**
   */
  protected tiebreak(values: number[]): number {
    //Übergeben werden alle möglichen, welche gezogen werden (also später alle möglichen Arme, welche gleiche Prob oder Mean haben)
    let best = -Infinity; //der kleinst mögliche Wert, damit jeder gezogene Wert garantiert größer ist
    let candidates: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (v > best) {
        best = v; //neuer bester Wert gefunden
        candidates = [i];
      } else if (v === best) {
        // wenn aktueller wert genauso gut ist füge ihn zu Kandidaten hinzu
        candidates.push(i);
      }
    }
    const idx = Math.floor(this.rng() * candidates.length); // zufällig den "besten" auswählen, Math.floor rundet die aktuelle Zahl immer AB
    return candidates[idx];
  }

  /**
   * Hilfsfunktion: Zufälliger Arm.
   * Liefert einen zufälligen Armindex im gültigen Bereich.
   * Oft für initiale Exploration verwendet.
   */
  protected randomArm(): number {
    return Math.floor(this.rng() * this.nArms);
  }

  // Erweiterungspunkte für Spezial-Policies
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onInitialize(_env: iBanditEnv): void {}
  protected onReset(): void {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onUpdate(_result: iPullResult): void {}
}
