import type { iBanditPolicy } from "../algorithms/Domain/iBanditPolicy";
import type { iBanditPolicyConfig } from "../algorithms/Domain/iBanditPolicyConfig";
import { Greedy } from "../algorithms/greedy";
import { EpsilonGreedy } from "../algorithms/EpsilonGreedy";

import type { iEnvConfig } from "../env/Domain/iEnvConfig";
import type { iBanditEnv } from "../env/Domain/iBanditEnv";
import type { iPullResult } from "../env/Domain/iPullResult";
import { GaussianBanditEnv } from "../env/GaussianBanditEnv";

export type PolicyId = "greedy" | "epsgreedy";

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
    policyConfigs?: Partial<Record<PolicyId, iBanditPolicyConfig>>;
};

export type RunnerStatus = "IDLE" | "CONFIGURED" | "RUNNING" | "PAUSED" | "STOPPED";

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
        isOptimal: boolean;
    };
}
    | { type: "PROGRESS"; payload: { step: number; remaining: number; total: number } }
    | { type: "LOG"; payload: { message: string } }
    | { type: "ERROR"; payload: { message: string } };

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

    // Events
    on(fn: (e: RunnerEvent) => void): () => void {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }
    private emit(e: RunnerEvent) {
        for (const fn of this.listeners) {
            try {
                fn(e);
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error("algorithmsRunner listener error", err);
            }
        }
    }

    // Getters
    getStatus(): RunnerStatus { return this.status; }
    getStep(): number { return this.step; }
    getTotalSteps(): number { return this.totalSteps; }
    getAll(): PolicyMeta[] { return [...this.items.values()]; }

    // Legacy alias
    init(envConfig: iEnvConfig) {
        this.configure({ envConfig, totalSteps: 0, rate: 1 });
    }

    // Lifecycle
    configure(cfg: RunnerConfig) {
        try {
            this.clearTimer();
            this.items.clear();
            this.step = 0;

            // separate envs per policy with seed offsets
            const mkEnv = (seedOffset: number) =>
                new GaussianBanditEnv({
                    ...cfg.envConfig,
                    seed: (cfg.envConfig.seed ?? 0) + seedOffset,
                });

            const greedy = new Greedy({
                ...(cfg.policyConfigs?.greedy ?? {}),
                arms: cfg.envConfig.arms,
            } as iBanditPolicyConfig);

            const eps = new EpsilonGreedy({
                ...(cfg.policyConfigs?.epsgreedy ?? {}),
                arms: cfg.envConfig.arms,
            } as iBanditPolicyConfig);

            const greedyEnv = mkEnv(11);
            const epsEnv = mkEnv(23);

            greedy.initialize(greedyEnv);
            greedy.reset();

            eps.initialize(epsEnv);
            eps.reset();

            this.items.set("greedy", {
                id: "greedy",
                label: "Greedy",
                color: "#4fc3f7",
                policy: greedy,
                env: greedyEnv,
                history: [],
                visible: true,
            });

            this.items.set("epsgreedy", {
                id: "epsgreedy",
                label: "ε-Greedy",
                color: "#f39c12",
                policy: eps,
                env: epsEnv,
                history: [],
                visible: true,
            });

            this.totalSteps = Math.max(0, cfg.totalSteps);
            this.rate = Math.max(1, cfg.rate);
            this.status = "CONFIGURED";

            this.emit({ type: "CONFIGURED", payload: { totalSteps: this.totalSteps, rate: this.rate } });
            this.emit({
                type: "LOG",
                payload: {
                    message: `Konfiguriert: ${this.items.size} Algorithmen · Ziel ${this.totalSteps} Schritte · Rate ${this.rate}/s`,
                },
            });
        } catch (err: any) {
            this.emit({ type: "ERROR", payload: { message: err?.message ?? String(err) } });
        }
    }

    start() {
        if (!(this.status === "CONFIGURED" || this.status === "PAUSED")) {
            this.emit({
                type: "ERROR",
                payload: { message: `Start in Status "${this.status}" nicht zulässig.` },
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
                payload: { message: `Einzelschritt in Status "${this.status}" nicht zulässig.` },
            });
            return;
        }
        if (this.totalSteps > 0 && this.step >= this.totalSteps) {
            this.emit({ type: "LOG", payload: { message: "Ziel erreicht." } });
            return;
        }
        this.stepAll();
    }

    // intern
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

            this.emit({
                type: "RESULT",
                payload: {
                    policyId: it.id,
                    step: this.step,
                    total: this.totalSteps,
                    action: res.action,
                    reward: res.reward,
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