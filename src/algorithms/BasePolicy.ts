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
   */
  constructor(protected cfg: iBanditPolicyConfig = {}) {
    this.rng = seedrandom(String(cfg.seed ?? "policy"));
  }

  /**
   * Initialisierung der Policy mit Angaben aus Environment.
   * Q wird hier auf 0 gesetzt.
   * N wird zurückgesetzt.
   * t wird auf 0 gesetzt.
   * 
   * @param env - Umgebung mit Angaben zu Anzahl der Arme
   */
  initialize(env: iBanditEnv): void {
    this.nArms = env.config.arms; 
    this.Q = Array(this.nArms).fill(0);   // Startwerte = 0
    this.N = Array(this.nArms).fill(0);   // Zähler zurücksetzen
    this.t = 0; 
  }

  /**
   * Setzt Zustand zurück auf Initialwerte (wie bei initialize).
   */
  reset(): void {
    this.Q.fill(0);
    this.N.fill(0);
    this.t = 0;
  }

  /**
   * Default-Update der Schätzwerte (inkrementelles Mittel).
   */
  update(result: iPullResult): void {
    const a = result.action;      
    this.N[a] += 1;              
    const n = this.N[a];         
    this.Q[a] += (result.reward - this.Q[a]) / n;
    this.Q[a] = updateMean(this.Q[a], result.reward, this.N[a]);
    this.t += 1;
  }

  getEstimates(): readonly number[] {
    return this.Q;
  }

  getCounts(): readonly number[] {
    return this.N;
  }

  abstract selectAction(): number;

  getInfo(): { name: string; params: Record<string, unknown> } {
    return { name: this.constructor.name, params: { ...this.cfg } };
  }

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
    const idx = Math.floor(this.rng() * candidates.length);
    return candidates[idx];
  }

  protected randomArm(): number {
    return Math.floor
