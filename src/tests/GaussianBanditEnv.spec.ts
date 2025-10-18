import { describe, it, expect } from "vitest";
import { GaussianBanditEnv } from "../env/GaussianBanditEnv.ts";
import type { iEnvConfig } from "../env/Domain/iEnvConfig";

describe("GaussianBanditEnv", () => {
  it("sollte mit gültiger Means/StdDev-Config instanziiert werden", () => {
    const cfg: iEnvConfig = {
      type: "gaussian",
      arms: 2,
      means: [1, 2],
      stdDev: [0.5, 1],
      seed: 42,
    };

    const env = new GaussianBanditEnv(cfg);
    expect(env.config.means).toEqual([1, 2]);
    expect(env.config.stdDev).toEqual([0.5, 1]);
    expect(env.optimalAction).toBe(1); // Arm mit mean=2 ist optimal
  });

  it("sollte Fehler werfen wenn nur Means oder StdDev angegeben ist", () => {
    const cfg1: iEnvConfig = {
      type: "gaussian",
      arms: 2,
      means: [0, 1],
      seed: 42,
    }; // stdDev fehlt

    const cfg2: iEnvConfig = {
      type: "gaussian",
      arms: 2,
      stdDev: [1, 1],
      seed: 42,
    }; // means fehlt

    expect(() => new GaussianBanditEnv(cfg1)).toThrow();
    expect(() => new GaussianBanditEnv(cfg2)).toThrow();
  });

  it("sollte Fehler werfen wenn Länge von means/stdDev nicht zu arms passt", () => {
    const cfg: iEnvConfig = {
      type: "gaussian",
      arms: 3,
      means: [0, 1], // nur 2 Werte statt 3
      stdDev: [1, 1],
      seed: 123,
    };

    expect(() => new GaussianBanditEnv(cfg)).toThrow();
  });

  it("sollte Fehler werfen wenn StdDev negativ ist", () => {
    const cfg: iEnvConfig = {
      type: "gaussian",
      arms: 2,
      means: [0, 1],
      stdDev: [1, -0.1], // negative Standardabweichung
      seed: 5,
    };

    expect(() => new GaussianBanditEnv(cfg)).toThrow(
      /standard deviation must be non-negative/,
    );
  });

  it("pull() sollte Reward generieren und isOptimal korrekt setzen", () => {
    const cfg: iEnvConfig = {
      type: "gaussian",
      arms: 2,
      means: [0, 5],
      stdDev: [1, 1],
      seed: 7,
    };

    const env = new GaussianBanditEnv(cfg);

    const result0 = env.pull(0);
    const result1 = env.pull(1);

    expect(result0).toHaveProperty("reward");
    expect(typeof result0.reward).toBe("number");
    expect(result0.isOptimal).toBe(false);

    expect(result1).toHaveProperty("reward");
    expect(typeof result1.reward).toBe("number");
    expect(result1.isOptimal).toBe(true);
  });

  it("sollte automatisch means und stdDev generieren wenn nicht angegeben", () => {
    const cfg: iEnvConfig = {
      type: "gaussian",
      arms: 3,
      seed: 999,
    };

    const env = new GaussianBanditEnv(cfg);

    // Means und stdDev sollten automatisch generiert worden sein
    expect(env.config.means).toBeDefined();
    expect(env.config.stdDev).toBeDefined();
    expect(env.config.means).toHaveLength(3);
    expect(env.config.stdDev).toHaveLength(3);

    // Alle stdDev sollten positiv sein
    env.config.stdDev!.forEach((s) => {
      expect(s).toBeGreaterThan(0);
    });
  });

  it("sollte truncatedMeans berechnen und im config speichern", () => {
    const cfg: iEnvConfig = {
      type: "gaussian",
      arms: 2,
      means: [10, 20],
      stdDev: [5, 5],
      seed: 123,
    };

    const env = new GaussianBanditEnv(cfg);

    // truncatedMeans sollte im config gespeichert sein
    expect((env.config as any).truncatedMeans).toBeDefined();
    expect((env.config as any).truncatedMeans).toHaveLength(2);

    // truncatedMeans sollten >= 0 sein (wegen Truncation bei 0)
    (env.config as any).truncatedMeans.forEach((tm: number) => {
      expect(tm).toBeGreaterThanOrEqual(0);
    });
  });

  it("pull() sollte nur nicht-negative Rewards zurückgeben", () => {
    const cfg: iEnvConfig = {
      type: "gaussian",
      arms: 2,
      means: [50, 100],
      stdDev: [10, 10],
      seed: 42,
    };

    const env = new GaussianBanditEnv(cfg);

    // Teste 100 pulls - alle sollten nicht-negativ sein
    for (let i = 0; i < 100; i++) {
      const result = env.pull(0);
      expect(result.reward).toBeGreaterThanOrEqual(0);
    }
  });

  it("sollte besten Arm basierend auf truncatedMeans identifizieren", () => {
    const cfg: iEnvConfig = {
      type: "gaussian",
      arms: 3,
      seed: 777,
    };

    const env = new GaussianBanditEnv(cfg);

    const truncMeans = (env.config as any).truncatedMeans as number[];
    const maxTruncMean = Math.max(...truncMeans);
    const expectedOptimal = truncMeans.indexOf(maxTruncMean);

    expect(env.optimalAction).toBe(expectedOptimal);
  });
});
