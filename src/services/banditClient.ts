/**
 * "API"-Layer: zentrale Fassade, über die die UI mit den Bandit-Umgebungen spricht.
 *
 * Die Idee hinter dem API-Ordner:
 *   - Stellt eine klar abgegrenzte Schnittstelle bereit, als läge die Logik extern.
 *   - UI/Composables müssen keine Details der Environment-Klassen kennen.
 *   - Später austauschbar gegen einen echten HTTP- oder Worker-Endpunkt.
 */
import type { iBanditEnv } from "../env/Domain/iBanditEnv.js";
import type { iEnvConfig } from "../env/Domain/iEnvConfig.js";
import type { iPullResult } from "../env/Domain/iPullResult.js";
import { GaussianBanditEnv } from "../env/GaussianBanditEnv.js";
import { BernoulliBanditEnv } from "../env/BernoulliBanditEnv.js";

type InitEnvResponse = { envId: string; optimalAction: number };

type EnvRecord = {
  env: iBanditEnv;
  counts: number[]; // klicks je thumbnail
  estimates: number[]; // laufender mittelwert (reward) je thumbnail
};

// Lokale "Session-Datenbank": envId -> Environment + Tracking-Daten
const REGISTRY = new Map<string, EnvRecord>();
const DEBUG = import.meta.env.VITE_API_DEBUG === "true";

// seed sicherstellen (interface verlangt einen, sonst meckert ts)
function ensureSeed(cfg: iEnvConfig): iEnvConfig {
  return { ...cfg, seed: cfg.seed ?? Math.floor(Math.random() * 1e9) };
}

/**
 * Erzeugt eine neue Environment-Instanz und gibt eine handlebare ID zurück.
 * So bleibt die UI unabhängig von konkreten Klassen.
 */
export async function initEnv(cfg: iEnvConfig): Promise<InitEnvResponse> {
  const base = ensureSeed(cfg);

  const env =
    base.type === "bernoulli"
      ? new BernoulliBanditEnv(base)
      : new GaussianBanditEnv(base);

  const envId = crypto.randomUUID();
  const counts = Array(env.config.arms).fill(0);
  const estimates = Array(env.config.arms).fill(0);

  REGISTRY.set(envId, { env, counts, estimates });

  if (DEBUG)
    console.debug("[env:init]", {
      envId,
      cfg: env.config,
      optimal: env.optimalAction,
    });

  return { envId, optimalAction: env.optimalAction };
}

/**
 * Führt einen Zug in der angefragten Environment aus und aktualisiert Kennzahlen.
 */
export async function pullAction(
  envId: string,
  action: number,
): Promise<iPullResult> {
  const rec = REGISTRY.get(envId);
  if (!rec) throw new Error("unknown envId (wer hat die verlegt?)");

  const res = rec.env.pull(action);

  // klassischer inkrementeller mittelwert
  rec.counts[action] = (rec.counts[action] || 0) + 1;
  const n = rec.counts[action];
  const prev = rec.estimates[action] || 0;
  rec.estimates[action] = prev + (res.reward - prev) / n;

  if (DEBUG)
    console.debug("[env:pull]", {
      envId,
      action,
      res,
      counts: rec.counts,
      estimates: rec.estimates,
    });

  return res;
}

/**
 * Liefert einen Read-Only-Snapshot (Parameter, Zähler, Schätzwerte) für Debug/UI.
 */
export function getEnvSnapshot(envId: string) {
  const rec = REGISTRY.get(envId);
  if (!rec) throw new Error("unknown envId (snapshots brauchen eine welt)");

  return {
    config: rec.env.config, // hier liegen die „wahren“ parameter
    optimalAction: rec.env.optimalAction,
    counts: [...rec.counts],
    estimates: [...rec.estimates],
  };
}

/**
 * Entfernt eine Environment-Instanz aus der Registry (Aufräumen bei Reset).
 */
export function destroyEnv(envId: string) {
  REGISTRY.delete(envId);
  if (DEBUG) console.debug("[env:destroy]", { envId });
}
