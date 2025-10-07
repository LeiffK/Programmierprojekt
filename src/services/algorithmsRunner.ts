/* eslint-disable @typescript-eslint/no-explicit-any */
import { reactive } from "vue";
import type { iEnvConfig } from "../env/Domain/iEnvConfig";
import type { iBanditEnv } from "../env/Domain/iBanditEnv";
import { pullAction } from "../api/banditClient";
import { Greedy } from "../algorithms/greedy";
import { EpsilonGreedy } from "../algorithms/EpsilonGreedy";

type RunnerStatus = "IDLE" | "RUNNING" | "PAUSED" | "STOPPED";

type RunnerItem = {
    id: string;    // "greedy" | "epsgreedy#1" | "custom"
    label: string; // Anzeigename
    policy: any;   // Policy-Instanz (Greedy/EpsilonGreedy/Custom)
};

type RunnerConfig = {
    envId: string;
    envConfig: iEnvConfig;
    totalSteps: number; // 0 => unendlich
    rate: number;       // Schritte/Sekunde
    policyConfigs?: any; // { greedy, epsgreedy: { variants }, customPolicy? }
};

type RunnerEvent =
    | { type: "STATUS"; payload: { status: RunnerStatus } }
    | {
    type: "RESULT";
    payload: {
        policyId: string;
        action: number;
        reward: number;
        isOptimal: boolean;
        // Progress-Felder für Debug/Logs:
        k: number;              // aktueller Schritt (1-basiert)
        K: number;              // Gesamtschritte (0 => ∞)
        step: number;           // alias k
        total: number;          // alias K
    };
}
    | { type: "RESET" }
    | { type: "LOG"; payload: any };

class AlgorithmsRunner {
    private status: RunnerStatus = "IDLE";
    private items = new Map<string, RunnerItem>();

    private envCfg: iEnvConfig | null = null;
    private envId: string | null = null;

    private totalSteps = 0;    // Ziel
    private stepsDone = 0;     // Fortschritt
    private rate = 1;

    private timer: number | null = null;
    private listeners = new Set<(e: RunnerEvent) => void>();

    on(cb: (e: RunnerEvent) => void) {
        this.listeners.add(cb);
        return () => this.listeners.delete(cb);
    }
    private emit(e: RunnerEvent) { this.listeners.forEach((l) => l(e)); }

    private hasWork() {
        return this.totalSteps === 0 || this.stepsDone < this.totalSteps;
    }

    configure(cfg: RunnerConfig) {
        this.stop("Reconfigure");
        this.items.clear();

        this.envId = cfg.envId;
        this.envCfg = cfg.envConfig;
        this.totalSteps = Math.max(0, Number(cfg.totalSteps ?? 0));
        this.stepsDone  = 0;
        this.rate       = Math.max(1, Number(cfg.rate ?? 1));

        const envStub: iBanditEnv = {
            config: this.envCfg,
            optimalAction: 0,
            pull: (a: number) => ({ action: a, reward: 0, isOptimal: false }),
        };

        // Greedy
        const greedyCfg = cfg.policyConfigs?.greedy ?? {};
        const greedy = new Greedy({
            optimisticInitialValue: greedyCfg.optimisticInitialValue,
            seed: this.envCfg.seed,
        });
        if (typeof greedy.initialize === "function") greedy.initialize(envStub);
        this.items.set("greedy", { id: "greedy", label: "Greedy", policy: greedy });

        // ε-Greedy-Varianten
        const egCfg = cfg.policyConfigs?.epsgreedy ?? {};
        const variants: Array<{ epsilon: number; optimisticInitialValue?: number }> =
            Array.isArray(egCfg.variants) && egCfg.variants.length
                ? egCfg.variants
                : [{ epsilon: egCfg.epsilon ?? 0.1, optimisticInitialValue: egCfg.optimisticInitialValue }];

        variants.forEach((v, idx) => {
            const id = `epsgreedy#${idx + 1}`;
            const label = `ε-Greedy v${idx + 1}`;
            const policy = new EpsilonGreedy({
                epsilon: Number(v?.epsilon ?? 0.1),
                optimisticInitialValue: v?.optimisticInitialValue,
                seed: this.envCfg!.seed,
            });
            if (typeof policy.initialize === "function") policy.initialize(envStub);
            this.items.set(id, { id, label, policy });
        });

        // Custom Policy (optional, genau eine)
        const custom = cfg.policyConfigs?.customPolicy;
        if (custom) {
            try { typeof custom.initialize === "function" && custom.initialize(envStub); } catch { /* ignore */ }
            const label = custom?.constructor?.name || "Custom";
            this.items.set("custom", { id: "custom", label, policy: custom });
        }

        this.emit({ type: "RESET" });
        this.setStatus("IDLE");
    }

    private setStatus(s: RunnerStatus) {
        this.status = s;
        this.emit({ type: "STATUS", payload: { status: s } });
    }
    getStatus() { return this.status; }

    start() {
        if (this.status === "RUNNING") return;
        if (!this.hasWork()) return; // nichts zu tun
        this.setStatus("RUNNING");

        const tick = async () => {
            if (this.status !== "RUNNING") return;

            // Stop-Kontrolle VOR dem Schritt
            if (!this.hasWork()) { this.stop("Completed"); return; }

            await this.stepOnce();

            // Stop-Kontrolle NACH dem Schritt
            if (!this.hasWork()) { this.stop("Completed"); return; }

            const intervalMs = Math.max(10, Math.floor(1000 / Math.max(1, this.rate)));
            this.timer = window.setTimeout(tick, intervalMs) as unknown as number;
        };

        tick();
    }

    pause() {
        if (this.timer != null) { window.clearTimeout(this.timer); this.timer = null; }
        if (this.status === "RUNNING") this.setStatus("PAUSED");
    }

    stop(reason = "Stop") {
        if (this.timer != null) { window.clearTimeout(this.timer); this.timer = null; }
        this.setStatus("IDLE");
        this.emit({ type: "LOG", payload: { stop: reason } });
    }

    async stepOnce() {
        if (!this.envId || !this.envCfg) return;

        // ein logischer "Runner-Schritt" besteht aus je 1 Policy-Schritt
        const k = this.stepsDone + 1; // 1-basiert für Logs
        const K = this.totalSteps;    // 0 => unendlich

        for (const [id, item] of this.items) {
            // API aus BasePolicy: selectAction() -> number
            const action = item.policy.selectAction();
            const res = await pullAction(this.envId, action);

            // API aus BasePolicy: update(iPullResult)
            item.policy.update(res);

            this.emit({
                type: "RESULT",
                payload: {
                    policyId: id,
                    action: res.action,
                    reward: res.reward,
                    isOptimal: res.isOptimal,
                    // Progress
                    k, K, step: k, total: K,
                },
            });
        }

        this.stepsDone += 1;
    }
}

export const algorithmsRunner = reactive(new AlgorithmsRunner()) as AlgorithmsRunner;