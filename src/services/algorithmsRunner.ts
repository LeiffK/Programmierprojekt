import type { iBanditPolicy } from "../algorithms/Domain/iBanditPolicy";
import type { iBanditPolicyConfig } from "../algorithms/Domain/iBanditPolicyConfig";
import { EpsilonGreedy } from "../algorithms/EpsilonGreedy";
import { Greedy } from "src/algorithms/Greedy";
import type { iEnvConfig } from "../env/Domain/iEnvConfig";
import type { iPullResult } from "../env/Domain/iPullResult";
import { GaussianBanditEnv } from "../env/GaussianBanditEnv";

export type PolicyId = "greedy" | "epsgreedy";
export type PolicyStep = { action: number; reward: number; isOptimal: boolean };

export type PolicyMeta = {
  id: PolicyId;
  label: string;
  color: string;
  policy: iBanditPolicy;
  env: GaussianBanditEnv;
  history: PolicyStep[];
};

const DEFAULTS: Record<
  PolicyId,
  { label: string; color: string; cfg?: iBanditPolicyConfig }
> = {
  greedy: { label: "Greedy", color: "#4fc3f7", cfg: {} },
  epsgreedy: {
    label: "Epsilon-Greedy",
    color: "#f39c12",
    cfg: { epsilon: 0.1 },
  },
};

export class AlgorithmsRunner {
  private items = new Map<PolicyId, PolicyMeta>();

  /** neues Environment? -> alle Policies frisch initialisieren */
  init(envCfg: iEnvConfig) {
    this.items.clear();

    const mkEnv = () => new GaussianBanditEnv({ ...envCfg });

    const defs: [PolicyId, iBanditPolicy][] = [
      ["greedy", new Greedy(DEFAULTS.greedy.cfg)],
      ["epsgreedy", new EpsilonGreedy(DEFAULTS.epsgreedy.cfg)],
    ];

    for (const [id, policy] of defs) {
      const env = mkEnv();
      policy.initialize(env);
      this.items.set(id, {
        id,
        label: DEFAULTS[id].label,
        color: DEFAULTS[id].color,
        policy,
        env,
        history: [],
      });
    }
  }

  /** alles zurück auf Anfang (z.B. beim Reset) */
  reset() {
    for (const it of this.items.values()) {
      it.policy.reset();
      it.history = [];
      it.env = new GaussianBanditEnv({ ...it.env.config });
    }
  }

  /** ein Schritt für ALLE Policies (rufst du nach jedem manuellen Klick auf) */
  stepAll() {
    for (const it of this.items.values()) {
      const a = it.policy.selectAction();
      const res: iPullResult = it.env.pull(a);
      it.policy.update(res);
      it.history.push({
        action: res.action,
        reward: res.reward,
        isOptimal: res.isOptimal,
      });
    }
  }

  getAll(): PolicyMeta[] {
    return [...this.items.values()];
  }
}

export const algorithmsRunner = new AlgorithmsRunner();
