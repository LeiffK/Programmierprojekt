import type { iPullResult } from "../env/Domain/iPullResult";
import type { iBanditEnv } from "../env/Domain/iBanditEnv";
import { BasePolicy } from "./BasePolicy";

/**
 * Thompson Sampling für Bernoulli-Banditen.
 *
 * Grundidee:
 * - Jede Aktion (Arm) wird durch eine Beta-Verteilung abgebildet: Beta(α, β).
 * - Erfolgreiche Ziehungen erhöhen α (Erfolge), Misserfolge erhöhen β.
 * - In jeder Runde wird eine Stichprobe aus jeder Beta-Verteilung gezogen
 *   und der Arm mit dem höchsten Wert gewählt.
 *
 * Vorteile:
 * - Balanciert Exploration und Exploitation probabilistisch.
 * - Passt sich dynamisch an Beobachtungen an.
 */
export class ThompsonSamplingBernoulli extends BasePolicy {
  private successes: number[] = []; // α-Parameter für Erfolgszählungen
  private failures: number[] = [];  // β-Parameter für Misserfolgszählungen

  /**
   * Initialisierung mit Environment.
   * Setzt alle Arme auf Startwerte (α=1, β=1 -> uniform prior).
   */
  override initialize(env: iBanditEnv): void {
    super.initialize(env);
    this
