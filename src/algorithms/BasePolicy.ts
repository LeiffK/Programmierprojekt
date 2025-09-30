import seedrandom from "seedrandom";
import type { iBanditPolicyConfig } from "./Domain/iBanditPolicyConfig";
import type { iBanditPolicy } from "./Domain/iBanditPolicy";
import type { iBanditEnv } from "../env/Domain/iBanditEnv";
import type { iPullResult } from "../env/Domain/iPullResult";
import { updateMean } from "../utils/updateMean.ts";

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
  protected t = 0;               // gesamt Steps, wie oft Aktionen gewählt wurden
  protected Q: number[] = [];    // Schätzungen je Arm (mittlere Belohnung)
  protected N: number[] = [];    // Zählungen je Arm, wie oft gewählt
  protected rng: () => number;   // Zufallsfunktion für Tiebreaks und mehr

  /**
   * Konstruktor.
   * Initialisiert rng mit Seed aus Konfiguration oder Standardwert "policy".
   * Übergibt weitere optionale Parameter in cfg (u.a. optimisticInitialValue).
   */
  constructor(protected cfg: iBanditPolicyConfig = {}) {
    this.rng = seedrandom(String(cfg.seed ?? "policy"));
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
    const optimisticValue = this.cfg.optimisticInitialValue ?? 0;
    this.Q = Array(this.nArms).fill(optimisticValue); // optimistische Startwerte fördern Exploration
    this.N = Array(this.nArms).fill(0);               // Zähler für Ziehungen je Arm
    this.t = 0;                                       // Gesamtanzahl Ziehungen
  }

  /**
   * Setzt Zustand zurück auf Initialwerte (wie bei initialize).
   * Q und N auf Startwerte (bzw. 0) setzen, t auf 0.
   */
  reset(): void {
    const optimisticValue = this.cfg.optimisticInitialValue ?? 0;
    this.Q.fill(optimisticValue); // alle Q-Werte auf Anfang setzen (optimistisch)
    this.N.fill(0);               // Zähler zurücksetzen
    this.t = 0;                  // Gesamtanzahl Steps zurücksetzen
  }

  /**
   * Default-Update der Schätzwerte (inkrementelles Mittel).
   * Nach Ziehung eines Arms werden Zähler erhöht und geschätzter Mittelwert angepasst.
   * Zusätzlich t (Gesamtanzahl Schritte) erhöht.
   * 
   * @param result - Ergebnis eines Zuges (Arm, Reward)
   */
  update(result: iPullResult): void {
    const a = result.action;           // Der gewählte Arm
    this.N[a] += 1;                   // Zähler des Arms erhöhen
    const n = this.N[a];              // Anzahl Ziehungen dieses Arms
    // Mittelwert-Update mit inkrementeller Form
    this.Q[a] += (result.reward - this.Q[a]) / n;
    // Zusätzliche Mittelwertanpassung über Utility-Funktion (optional)
    this.Q[a] = updateMean(this.Q[a], result.reward, this.N[a]);
    this.t += 1;                     // Gesamtanzahl Schritte erhöhen
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

  /**
   * Hilfsfunktion: argmax mit zufälligem Tiebreak.
   * Findet Index mit maximalem Wert in Array.
   * Bei Gleichstand wird zufällig einer der besten Indizes gewählt.
   * 
   * @param values - Array mit Werten
   * @returns Index des argmax
   */
  protected argmax(values: number[]): number {
    let best = -Infinity;
    let candidates: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (v > best) {
        best = v;
        candidates = [i];
      } else if (v === best) {
        candidates.push(i);
      }
    }
    const idx = Math.floor(this.rng() * candidates.length); // Zufälliger Tiebreak
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
}
