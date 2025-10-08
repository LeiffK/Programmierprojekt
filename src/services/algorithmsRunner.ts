import type { iBanditPolicy } from "../algorithms/Domain/iBanditPolicy";
import type { iBanditPolicyConfig } from "../algorithms/Domain/iBanditPolicyConfig";
import { Greedy } from "../algorithms/greedy";
import { EpsilonGreedy } from "../algorithms/EpsilonGreedy";

import type { iEnvConfig } from "../env/Domain/iEnvConfig";
import type { iBanditEnv } from "../env/Domain/iBanditEnv";
import type { iPullResult } from "../env/Domain/iPullResult";
import { GaussianBanditEnv } from "../env/GaussianBanditEnv";

/**
 * Abwärtskompatibel: Wir lassen zusätzliche ε-Varianten zu.
 * - Bei >1 Variante emittieren wir IDs "epsgreedy#1", "epsgreedy#2", …
 * - Bei genau 1 Variante bleibt die ID "epsgreedy" (kompatibel).
 */
export type PolicyId = string; // "greedy" | "epsgreedy" | `epsgreedy#${n}`

export type PolicyMeta = {
  id: PolicyId;
  label: string;
  color: string;
  policy: iBanditPolicy;
  env: iBanditEnv;
  history: Array<{ action: number; reward: number; isOptimal: boolean }>;
  visible?: boolean;
};

export type RunnerConfig = {
  envConfig: iEnvConfig;
  totalSteps: number;
  rate: number; // steps/second
  policyConfigs?: Partial<
    Record<"greedy" | "epsgreedy", iBanditPolicyConfig>
  > & {
    epsgreedy?: iBanditPolicyConfig & {
      variants?: Array<{ epsilon: number; optimisticInitialValue?: number }>;
    };
    // toleriert, wird vom Runner ignoriert – nur Info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customPolicy?: any;
  };
};

export type RunnerStatus =
  | "IDLE"
  | "CONFIGURED"
  | "RUNNING"
  | "PAUSED"
  | "STOPPED";

export type RunnerEvent =
  | { type: "READY" }
  | { type: "CONFIGURED"; payload: { totalSteps: number; rate: number } }
  | { type: "STARTED" }
  | { type: "PAUSED" }
  | { type: "STOPPED"; payload: { reason: string } }
  | {
      type: "RESULT";
      payload: {
        policyId: PolicyId;
        step: number;
        total: number;
        action: number;
        reward: number;
        expected: number;
        isOptimal: boolean;
      };
    }
  | {
      type: "PROGRESS";
      payload: { step: number; remaining: number; total: number };
    }
  | { type: "LOG"; payload: { message: string } }
  | { type: "ERROR"; payload: { message: string } };

const PALETTE = [
  "#f39c12",
  "#e91e63",
  "#9c27b0",
  "#00bcd4",
  "#8bc34a",
  "#ffc107",
  "#ff5722",
  "#03a9f4",
  "#cddc39",
  "#795548",
];

class AlgorithmsRunner {
  private items: Map<PolicyId, PolicyMeta> = new Map();
  private status: RunnerStatus = "IDLE";
  private step = 0;
  private totalSteps = 0;
  private rate = 1;
  private tick: number | null = null;
  private listeners: Set<(e: RunnerEvent) => void> = new Set();

  constructor() {
    queueMicrotask(() => this.emit({ type: "READY" }));
  }

  on(fn: (e: RunnerEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit(e: RunnerEvent) {
    for (const fn of this.listeners) {
      try {
        fn(e);
      } catch (err) {
        console.error("algorithmsRunner listener error", err);
      }
    }
  }

  getStatus(): RunnerStatus {
    return this.status;
  }
  getStep(): number {
    return this.step;
  }
  getTotalSteps(): number {
    return this.totalSteps;
  }
  getAll(): PolicyMeta[] {
    return [...this.items.values()];
  }

  // Legacy alias
  init(envConfig: iEnvConfig) {
    this.configure({ envConfig, totalSteps: 0, rate: 1 });
  }

  configure(cfg: RunnerConfig) {
    try {
      this.clearTimer();
      this.items.clear();
      this.step = 0;

      // eigener Env je Policy mit Seed-Offset
      const mkEnv = (seedOffset: number) =>
        new GaussianBanditEnv({
          ...cfg.envConfig,
          seed: (cfg.envConfig.seed ?? 0) + seedOffset,
        });

      // --- Greedy ---
      const greedy = new Greedy({
        ...(cfg.policyConfigs?.greedy ?? undefined),
        arms: cfg.envConfig.arms,
      } as iBanditPolicyConfig);
      const greedyEnv = mkEnv(11);
      greedy.initialize(greedyEnv);

      this.items.set("greedy", {
        id: "greedy",
        label: "Greedy",
        color: "#4fc3f7",
        policy: greedy,
        env: greedyEnv,
        history: [],
        visible: true,
      });

      // --- ε-Greedy (Varianten) ---
      const egInput = cfg.policyConfigs?.epsgreedy as
        | (iBanditPolicyConfig & {
            variants?: Array<{
              epsilon: number;
              optimisticInitialValue?: number;
            }>;
          })
        | undefined;
      const variants = (
        egInput?.variants?.length
          ? egInput.variants
          : [
              {
                epsilon: (egInput as any)?.epsilon ?? 0.1,
                optimisticInitialValue:
                  (egInput as any)?.optimisticInitialValue ?? 150,
              },
            ]
      ) as Array<{ epsilon: number; optimisticInitialValue?: number }>;

      let colorIdx = 0;
      variants.forEach((v, idx) => {
        const isSingle = variants.length === 1;
        const id = isSingle ? "epsgreedy" : `epsgreedy#${idx + 1}`;
        const label = isSingle
          ? "ε-Greedy"
          : `ε-Greedy v${idx + 1} (ε=${Number(v.epsilon ?? 0.1).toFixed(2)})`;

        const eps = new EpsilonGreedy({
          ...(egInput ?? undefined),
          epsilon: Number(v.epsilon ?? (egInput as any)?.epsilon ?? 0.1),
          optimisticInitialValue:
            v.optimisticInitialValue ??
            (egInput as any)?.optimisticInitialValue,
          arms: cfg.envConfig.arms,
        } as iBanditPolicyConfig);

        const env = mkEnv(23 + idx * 7);
        eps.initialize(env);

        this.items.set(id, {
          id,
          label,
          color:
            variants.length === 1
              ? "#f39c12"
              : PALETTE[colorIdx++ % PALETTE.length],
          policy: eps,
          env,
          history: [],
          visible: true,
        });
      });

      if ((cfg.policyConfigs as any)?.customPolicy) {
        this.emit({
          type: "LOG",
          payload: {
            message: "Hinweis: customPolicy wird vom Runner nicht ausgeführt.",
          },
        });
      }
      if (variants.length > 1) {
        this.emit({
          type: "LOG",
          payload: {
            message: `ε-Greedy: ${variants.length} Varianten konfiguriert.`,
          },
        });
      }

      this.totalSteps = Math.max(0, cfg.totalSteps);
      this.rate = Math.max(1, cfg.rate);
      this.status = "CONFIGURED";

      this.emit({
        type: "CONFIGURED",
        payload: { totalSteps: this.totalSteps, rate: this.rate },
      });
      this.emit({
        type: "LOG",
        payload: {
          message: `Konfiguriert: ${this.items.size} Algorithmen · Ziel ${this.totalSteps} Schritte · Rate ${this.rate}/s`,
        },
      });
    } catch (err: any) {
      this.emit({
        type: "ERROR",
        payload: { message: err?.message ?? String(err) },
      });
    }
  }

  start() {
    if (!(this.status === "CONFIGURED" || this.status === "PAUSED")) {
      this.emit({
        type: "ERROR",
        payload: {
          message: `Start in Status "${this.status}" nicht zulässig.`,
        },
      });
      return;
    }
    if (this.step >= this.totalSteps) {
      this.step = 0;
      for (const it of this.items.values()) {
        it.policy.reset();
        it.history = [];
      }
    }

    this.status = "RUNNING";
    this.emit({ type: "STARTED" });

    const intervalMs = Math.max(10, Math.floor(1000 / this.rate));
    this.clearTimer();
    this.tick = window.setInterval(() => {
      if (this.status !== "RUNNING") return;
      if (this.totalSteps > 0 && this.step >= this.totalSteps) {
        this.stop("Ziel erreicht");
        return;
      }
      this.stepAll();
    }, intervalMs) as unknown as number;
  }

  pause() {
    if (this.status !== "RUNNING") return;
    this.clearTimer();
    this.status = "PAUSED";
    this.emit({ type: "PAUSED" });
  }

  stop(reason = "Manuell gestoppt") {
    if (this.status === "IDLE") return;
    this.clearTimer();
    this.status = "STOPPED";
    this.emit({ type: "STOPPED", payload: { reason } });
  }

  stepOnce() {
    if (!(this.status === "CONFIGURED" || this.status === "PAUSED")) {
      this.emit({
        type: "ERROR",
        payload: {
          message: `Einzelschritt in Status "${this.status}" nicht zulässig.`,
        },
      });
      return;
    }
    if (this.totalSteps > 0 && this.step >= this.totalSteps) {
      this.emit({ type: "LOG", payload: { message: "Ziel erreicht." } });
      return;
    }
    this.stepAll();
  }

  private stepAll() {
    this.step += 1;

    for (const it of this.items.values()) {
      const action = it.policy.selectAction();
      const res: iPullResult = it.env.pull(action);
      it.policy.update(res);
      it.history.push({
        action: res.action,
        reward: res.reward,
        isOptimal: res.isOptimal,
      });

      const estimates = (it.policy as any).getEstimates?.();
      const expected =
        Array.isArray(estimates) && typeof estimates[res.action] === "number"
          ? estimates[res.action]
          : 0;

      this.emit({
        type: "RESULT",
        payload: {
          policyId: it.id,
          step: this.step,
          total: this.totalSteps,
          action: res.action,
          reward: res.reward,
          expected,
          isOptimal: res.isOptimal,
        },
      });
    }

    this.emit({
      type: "PROGRESS",
      payload: {
        step: this.step,
        remaining: Math.max(0, this.totalSteps - this.step),
        total: this.totalSteps,
      },
    });

    if (this.totalSteps > 0 && this.step >= this.totalSteps) {
      this.stop("Ziel erreicht");
    }
  }

  private clearTimer() {
    if (this.tick != null) {
      clearInterval(this.tick as unknown as number);
      this.tick = null;
    }
  }
}

export const algorithmsRunner = new AlgorithmsRunner();
