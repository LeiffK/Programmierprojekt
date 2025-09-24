import type { iBanditEnv } from "../env/Domain/iBanditEnv.js";
import type { iEnvConfig } from "../env/Domain/iEnvConfig.js";
import type { iPullResult } from "../env/Domain/iPullResult.js";
import { GaussianBanditEnv } from "../env/GaussianBanditEnv.js";

type InitEnvResponse = { envId: string; optimalAction: number };

type EnvRecord = {
  env: iBanditEnv;
  counts: number[]; // klicks je thumbnail
  estimates: number[]; // laufender mittelwert (reward) je thumbnail
};

const REGISTRY = new Map<string, EnvRecord>();
const DEBUG = import.meta.env.VITE_API_DEBUG === "true";

// seed sicherstellen (interface verlangt einen, sonst meckert ts)
function ensureSeed(cfg: iEnvConfig): iEnvConfig {
  return { ...cfg, seed: cfg.seed ?? Math.floor(Math.random() * 1e9) };
}

export async function initEnv(cfg: iEnvConfig): Promise<InitEnvResponse> {
  const base = ensureSeed(cfg);

  if (base.type !== "gaussian") {
    // absichtlich: bernoulli kommt später.
    throw new Error('Only "gaussian" is supported at the moment.');
  }

  // GaussianBanditEnv generiert means/stdDev selbst, wenn nix kommt — sehr nett.
  const env = new GaussianBanditEnv(base);

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

export function destroyEnv(envId: string) {
  REGISTRY.delete(envId);
  if (DEBUG) console.debug("[env:destroy]", { envId });
}
