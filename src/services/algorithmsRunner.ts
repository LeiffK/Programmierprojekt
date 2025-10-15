import type { iBanditPolicy } from "../algorithms/Domain/iBanditPolicy";
import type { iBanditPolicyConfig } from "../algorithms/Domain/iBanditPolicyConfig";
import type { iCustomPolicyRegistration } from "../algorithms/Domain/iCustomPolicyRegistration";

import { Greedy } from "../algorithms/greedy";
import { EpsilonGreedy } from "../algorithms/EpsilonGreedy";
import { UpperConfidenceBound } from "../algorithms/UpperConfidenceBound";
import { ThompsonSamplingBernoulli } from "../algorithms/ThompsonSamplingBernoulli";
import { ThompsonSamplingGaussian } from "../algorithms/ThompsonSamplingGaussian";
import { GradientBandit } from "../algorithms/GradientBandit";

import type { iEnvConfig } from "../env/Domain/iEnvConfig";
import type { iBanditEnv } from "../env/Domain/iBanditEnv";
import type { iPullResult } from "../env/Domain/iPullResult";
import { GaussianBanditEnv } from "../env/GaussianBanditEnv";
import { BernoulliBanditEnv } from "../env/BernoulliBanditEnv";

/** IDs */
export type PolicyId = string;

export type PolicyMeta = {
  id: PolicyId;
  label: string;
  color: string;
  policy: iBanditPolicy;
  env: iBanditEnv;
  history: Array<{ action: number; reward: number; isOptimal: boolean }>;
  visible?: boolean;
};

/* ==== spezifische Konfigtypen pro Algo ==== */
type GreedyVariant = { optimisticInitialValue?: number };
type GreedyCfg = iBanditPolicyConfig & {
  optimisticInitialValue?: number;
  variants?: GreedyVariant[];
};

type EpsGreedyVariant = { epsilon: number; optimisticInitialValue?: number };
type EpsGreedyCfg = iBanditPolicyConfig & {
  epsilon?: number;
  optimisticInitialValue?: number;
  variants?: EpsGreedyVariant[];
};

type UcbVariant = { confidence?: number; optimisticInitialValue?: number };
type UcbCfg = {
  confidence?: number;
  optimisticInitialValue?: number;
  variants?: UcbVariant[];
};

/** Thompson ohne alpha (Bernoulli nutzt Defaults) */
type ThompsonBernV = {}; // keine alpha-Eingabe mehr
type ThompsonGaussV = { priorVariance?: number };
type ThompsonCfg = {
  /** Einzel-Defaults (Fallbacks) */
  priorVariance?: number; // Gaussian
  /** Varianten */
  variants?: Array<ThompsonBernV | ThompsonGaussV>;
  variantsBernoulli?: ThompsonBernV[];
  variantsGaussian?: ThompsonGaussV[];
};

/** Gradient ohne alpha (nutzt Defaults) */
type GradientCfg = Record<string, never>;

export type RunnerConfig = {
  envConfig: iEnvConfig;
  totalSteps: number;
  rate: number; // steps/second
  policyConfigs?: {
    greedy?: GreedyCfg;
    epsgreedy?: EpsGreedyCfg;
    ucb?: UcbCfg;
    thompson?: ThompsonCfg;
    gradient?: GradientCfg;
    customPolicies?: iCustomPolicyRegistration[];
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
      const mkEnv = (seedOffset: number) => {
        const initCfg = {
          ...cfg.envConfig,
          seed: (cfg.envConfig.seed ?? 0) + seedOffset,
        };
        return initCfg.type === "bernoulli"
          ? new BernoulliBanditEnv(initCfg)
          : new GaussianBanditEnv(initCfg);
      };

      /* --- Greedy (Varianten) --- */
      {
        const greedyCfg = (cfg.policyConfigs?.greedy ?? {}) as GreedyCfg;
        const hasExplicitVariants = Array.isArray(greedyCfg.variants);
        const variants = hasExplicitVariants
          ? (greedyCfg.variants ?? [])
          : [
              {
                optimisticInitialValue: greedyCfg.optimisticInitialValue,
              },
            ];

        if (variants.length) {
          let colorIdx = 0;
          variants.forEach((variant, idx) => {
            const isSingle = variants.length === 1;
            const id = isSingle ? "greedy" : `greedy#${idx + 1}`;
            const oiv = Number(
              variant?.optimisticInitialValue ??
                greedyCfg.optimisticInitialValue ??
                0,
            );
            const label = isSingle
              ? "Greedy"
              : `Greedy v${idx + 1} (OIV=${oiv.toFixed(2)})`;

            const instCfg: any = {
              ...(cfg.policyConfigs?.greedy ?? {}),
              optimisticInitialValue: oiv,
              arms: cfg.envConfig.arms,
            };
            delete instCfg.variants;

            const greedy = new Greedy(instCfg as iBanditPolicyConfig);
            const greedyEnv = mkEnv(11 + idx * 5);
            greedy.initialize(greedyEnv);

            this.items.set(id, {
              id,
              label,
              color: isSingle
                ? "#4fc3f7"
                : PALETTE[colorIdx++ % PALETTE.length],
              policy: greedy,
              env: greedyEnv,
              history: [],
              visible: true,
            });
          });
        }
      }

      /* --- ε-Greedy (Varianten) --- */
      {
        const egInput = cfg.policyConfigs?.epsgreedy as
          | EpsGreedyCfg
          | undefined;
        const hasExplicitVariants = Array.isArray(egInput?.variants);
        const egVariants: EpsGreedyVariant[] = hasExplicitVariants
          ? (egInput?.variants ?? [])
          : [
              {
                epsilon: Number((egInput as any)?.epsilon ?? 0.1),
                optimisticInitialValue: Number(
                  (egInput as any)?.optimisticInitialValue ?? 150,
                ),
              },
            ];

        if (egVariants.length) {
          let colorIdx = 0;
          egVariants.forEach((v, idx) => {
            const isSingle = egVariants.length === 1;
            const id = isSingle ? "epsgreedy" : `epsgreedy#${idx + 1}`;
            const label = isSingle
              ? "e-Greedy"
              : `e-Greedy v${idx + 1} (e=${Number(v.epsilon ?? 0.1).toFixed(2)})`;

            const instCfg: any = {
              ...(cfg.policyConfigs?.epsgreedy ?? {}),
              epsilon: Number(v.epsilon ?? (egInput as any)?.epsilon ?? 0.1),
              optimisticInitialValue:
                v.optimisticInitialValue ??
                (egInput as any)?.optimisticInitialValue,
              arms: cfg.envConfig.arms,
            };
            delete instCfg.variants;

            const eps = new EpsilonGreedy(instCfg as iBanditPolicyConfig);

            const env = mkEnv(23 + idx * 7);
            eps.initialize(env);

            this.items.set(id, {
              id,
              label,
              color: isSingle
                ? "#f39c12"
                : PALETTE[colorIdx++ % PALETTE.length],
              policy: eps,
              env,
              history: [],
              visible: true,
            });
          });
        }
      }

      /* --- UCB (Varianten optional) --- */
      {
        const ucbCfg = (cfg.policyConfigs?.ucb ?? {}) as UcbCfg;
        const hasExplicitVariants = Array.isArray(ucbCfg.variants);
        const variants = hasExplicitVariants
          ? (ucbCfg.variants ?? [])
          : [
              {
                confidence: ucbCfg.confidence,
                optimisticInitialValue: ucbCfg.optimisticInitialValue,
              },
            ];

        if (variants.length) {
          let ucbColorIdx = 0;
          variants.forEach((variant, idx) => {
            const isSingle = variants.length === 1;
            const id = isSingle ? "ucb" : `ucb#${idx + 1}`;
            const confidence = Number(
              variant?.confidence ?? ucbCfg.confidence ?? 1,
            );
            const oiv =
              variant?.optimisticInitialValue ?? ucbCfg.optimisticInitialValue;
            const label = isSingle
              ? "UCB"
              : `UCB v${idx + 1} (c=${confidence.toFixed(2)})`;

            const instCfg: any = {
              ...(cfg.policyConfigs?.ucb ?? {}),
              confidence,
              optimisticInitialValue: oiv,
              arms: cfg.envConfig.arms,
            };
            delete instCfg.variants;

            const inst = new UpperConfidenceBound(instCfg as any);
            const env = mkEnv(101 + idx * 3);
            (inst as any).initialize?.(env);

            this.items.set(id, {
              id,
              label,
              color: isSingle
                ? "#009688"
                : PALETTE[ucbColorIdx++ % PALETTE.length],
              policy: inst,
              env,
              history: [],
              visible: true,
            });
          });
        }
      }

      /* --- Thompson Sampling (Varianten je Env) --- */
      {
        const tsInput = (cfg.policyConfigs?.thompson ?? {}) as
          | ThompsonCfg
          | any;
        const isBernoulli = cfg.envConfig.type === "bernoulli";

        if (isBernoulli) {
          const hasBernExplicit = Array.isArray(tsInput?.variantsBernoulli);
          const hasSharedExplicit = Array.isArray(tsInput?.variants);
          const listRaw = hasBernExplicit
            ? ((tsInput?.variantsBernoulli ?? []) as ThompsonBernV[])
            : hasSharedExplicit
              ? ((tsInput?.variants ?? []) as ThompsonBernV[])
              : ([{}] as ThompsonBernV[]);

          if (listRaw.length) {
            listRaw.forEach((_v: ThompsonBernV, idx: number) => {
              const isSingle = listRaw.length === 1;
              const id = isSingle ? "thompson" : `thompson#${idx + 1}`;
              const label = isSingle
                ? "Thompson (Bernoulli)"
                : `Thompson (Bernoulli) v${idx + 1}`;

              const bernCfg: ConstructorParameters<
                typeof ThompsonSamplingBernoulli
              >[0] = {
                seed:
                  typeof cfg.envConfig.seed === "number"
                    ? cfg.envConfig.seed
                    : undefined,
              };
              const th = new ThompsonSamplingBernoulli(
                bernCfg as unknown as ConstructorParameters<
                  typeof ThompsonSamplingBernoulli
                >[0],
              );
              const env = mkEnv(131 + idx * 5);
              th.initialize(env);

              this.items.set(id, {
                id,
                label,
                color: isSingle
                  ? "#607d8b"
                  : PALETTE[(idx + 2) % PALETTE.length],
                policy: th,
                env,
                history: [],
                visible: true,
              });
            });
          }
        } else {
          const hasGaussExplicit = Array.isArray(tsInput?.variantsGaussian);
          const hasSharedExplicit = Array.isArray(tsInput?.variants);
          const defaultVar = Number((tsInput as any)?.priorVariance ?? 1);
          const listRaw = hasGaussExplicit
            ? ((tsInput?.variantsGaussian ?? []) as ThompsonGaussV[])
            : hasSharedExplicit
              ? ((tsInput?.variants ?? []) as ThompsonGaussV[])
              : ([{ priorVariance: defaultVar }] as ThompsonGaussV[]);

          if (listRaw.length) {
            listRaw.forEach((v: ThompsonGaussV, idx: number) => {
              const isSingle = listRaw.length === 1;
              const id = isSingle ? "thompson" : `thompson#${idx + 1}`;
              const priorVariance = Number(v?.priorVariance ?? defaultVar);
              const label = isSingle
                ? "Thompson (Gaussian)"
                : `Thompson (Gaussian) v${idx + 1} (Var=${priorVariance.toFixed(2)})`;

              const gauCfg: ConstructorParameters<
                typeof ThompsonSamplingGaussian
              >[0] = {
                seed:
                  typeof cfg.envConfig.seed === "number"
                    ? cfg.envConfig.seed
                    : undefined,
                priorVariance,
              };
              const th = new ThompsonSamplingGaussian(
                gauCfg as unknown as ConstructorParameters<
                  typeof ThompsonSamplingGaussian
                >[0],
              );
              const env = mkEnv(141 + idx * 5);
              th.initialize(env);

              this.items.set(id, {
                id,
                label,
                color: isSingle
                  ? "#607d8b"
                  : PALETTE[(idx + 3) % PALETTE.length],
                policy: th,
                env,
                history: [],
                visible: true,
              });
            });
          }
        }
      }

      /* --- Gradient Bandit (ohne alpha, keine Varianten) --- */
      {
        const gradCfg: ConstructorParameters<typeof GradientBandit>[0] = {
          seed:
            typeof cfg.envConfig.seed === "number"
              ? cfg.envConfig.seed
              : undefined,
          // kein alpha – nutzt Default der Implementierung
        };
        const grad = new GradientBandit(
          gradCfg as unknown as ConstructorParameters<typeof GradientBandit>[0],
        );
        const env = mkEnv(151);
        grad.initialize(env);

        this.items.set("gradient", {
          id: "gradient",
          label: "Gradient Bandit",
          color: "#795548",
          policy: grad,
          env,
          history: [],
          visible: true,
        });
      }

      /* --- Custom Policies --- */
      {
        const customPoliciesRaw = cfg.policyConfigs?.customPolicies;
        const customRegs = Array.isArray(customPoliciesRaw)
          ? (customPoliciesRaw as iCustomPolicyRegistration[])
          : [];
        customRegs.forEach((entry, idx) => {
          try {
            if (!entry || typeof entry.factory !== "function") {
              throw new Error("Ungueltige Custom-Policy-Konfiguration.");
            }
            const policy = entry.factory();
            if (!policy || typeof policy.initialize !== "function") {
              throw new Error("Custom-Policy ohne initialize().");
            }
            const env = mkEnv(201 + idx * 13);
            policy.initialize(env);

            this.items.set(entry.id, {
              id: entry.id,
              label: entry.name ?? entry.id,
              color: PALETTE[(idx + 5) % PALETTE.length],
              policy,
              env,
              history: [],
              visible: true,
            });
          } catch (err: any) {
            this.emit({
              type: "ERROR",
              payload: {
                message: `Custom-Policy "${entry?.name ?? entry?.id ?? "?"}": ${
                  err?.message ?? String(err)
                }`,
              },
            });
          }
        });
        if (customRegs.length) {
          this.emit({
            type: "LOG",
            payload: {
              message: `Custom Policies: ${customRegs.length} aktiviert.`,
            },
          });
        }
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
