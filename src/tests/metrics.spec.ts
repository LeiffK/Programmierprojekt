import { describe, it, expect } from "vitest";
import {
  buildMetricsRowFromManual,
  buildSeriesFromManual,
} from "../services/metrics";
import type { ManualStep } from "../domain/iHistory";
import type { iEnvConfig } from "../env/Domain/iEnvConfig";
import type { iSeriesConfig } from "../domain/chart/iSeriesConfig";

describe("metrics", () => {
  describe("buildMetricsRowFromManual", () => {
    const defaultSeriesCfg: iSeriesConfig = {
      id: "test",
      label: "Test Series",
      color: "#fff",
      visible: true,
    };

    it("berechnet korrekte Metriken für leere History", () => {
      const history: ManualStep[] = [];
      const envCfg: iEnvConfig = {
        type: "bernoulli",
        arms: 3,
        probs: [0.1, 0.5, 0.3],
      };

      const result = buildMetricsRowFromManual(
        history,
        envCfg,
        defaultSeriesCfg,
      );

      expect(result.n).toBe(0);
      expect(result.cumReward).toBe(0);
      expect(result.avgReward).toBe(0);
      expect(result.bestChoiceRate).toBe(0);
      expect(result.regret).toBe(0);
      expect(result.lastAction).toBeUndefined();
      expect(result.lastReward).toBeUndefined();
    });

    it("berechnet kumulativen Reward korrekt", () => {
      const history: ManualStep[] = [
        { action: 0, reward: 10, isOptimal: true },
        { action: 1, reward: 5, isOptimal: false },
        { action: 0, reward: 8, isOptimal: true },
      ];
      const envCfg: iEnvConfig = {
        type: "gaussian",
        arms: 2,
        means: [10, 5],
        stdDev: [1, 1],
      };

      const result = buildMetricsRowFromManual(
        history,
        envCfg,
        defaultSeriesCfg,
      );

      expect(result.cumReward).toBe(23);
      expect(result.avgReward).toBeCloseTo(23 / 3);
      expect(result.n).toBe(3);
    });

    it("berechnet Best Choice Rate korrekt (Bernoulli)", () => {
      const history: ManualStep[] = [
        { action: 1, reward: 1, isOptimal: true },
        { action: 1, reward: 1, isOptimal: true },
        { action: 0, reward: 0, isOptimal: false },
        { action: 1, reward: 1, isOptimal: true },
      ];
      const envCfg: iEnvConfig = {
        type: "bernoulli",
        arms: 2,
        probs: [0.3, 0.7], // Arm 1 ist der beste
      };

      const result = buildMetricsRowFromManual(
        history,
        envCfg,
        defaultSeriesCfg,
      );

      expect(result.bestChoiceRate).toBe(0.75); // 3 von 4
    });

    it("berechnet Regret korrekt", () => {
      const history: ManualStep[] = [
        { action: 0, reward: 5, isOptimal: false }, // Regret: 10-5 = 5
        { action: 1, reward: 10, isOptimal: true }, // Regret: 0
        { action: 0, reward: 3, isOptimal: false }, // Regret: 10-3 = 7
      ];
      const envCfg: iEnvConfig = {
        type: "gaussian",
        arms: 2,
        means: [5, 10], // Arm 1 ist der beste mit mean=10
        stdDev: [1, 1],
      };

      const result = buildMetricsRowFromManual(
        history,
        envCfg,
        defaultSeriesCfg,
      );

      expect(result.regret).toBe(12); // 5 + 0 + 7
    });

    it("speichert letzte Aktion und Reward", () => {
      const history: ManualStep[] = [
        { action: 0, reward: 5, isOptimal: false },
        { action: 1, reward: 10, isOptimal: true },
      ];
      const envCfg: iEnvConfig = {
        type: "bernoulli",
        arms: 2,
        probs: [0.3, 0.7],
      };

      const result = buildMetricsRowFromManual(
        history,
        envCfg,
        defaultSeriesCfg,
      );

      expect(result.lastAction).toBe(1);
      expect(result.lastReward).toBe(10);
    });

    it("setzt kind korrekt basierend auf seriesId", () => {
      const history: ManualStep[] = [];
      const envCfg: iEnvConfig = {
        type: "bernoulli",
        arms: 2,
        probs: [0.5, 0.5],
      };

      const manualCfg: iSeriesConfig = {
        ...defaultSeriesCfg,
        id: "manual",
      };
      const algoCfg: iSeriesConfig = {
        ...defaultSeriesCfg,
        id: "greedy",
      };

      const manualResult = buildMetricsRowFromManual(
        history,
        envCfg,
        manualCfg,
      );
      const algoResult = buildMetricsRowFromManual(history, envCfg, algoCfg);

      expect(manualResult.kind).toBe("manual");
      expect(algoResult.kind).toBe("algo");
    });

    it("funktioniert mit null envConfig", () => {
      const history: ManualStep[] = [
        { action: 0, reward: 5, isOptimal: true },
      ];

      const result = buildMetricsRowFromManual(
        history,
        null,
        defaultSeriesCfg,
      );

      expect(result.n).toBe(1);
      expect(result.cumReward).toBe(5);
      expect(result.regret).toBe(0);
    });

    it("funktioniert mit truncatedMeans (Gaussian)", () => {
      const history: ManualStep[] = [
        { action: 0, reward: 5, isOptimal: false },
        { action: 1, reward: 10, isOptimal: true },
      ];
      const envCfg: iEnvConfig = {
        type: "gaussian",
        arms: 2,
        means: [5, 10],
        stdDev: [1, 1],
      };
      // Simuliere truncatedMeans wie GaussianBanditEnv sie setzt
      (envCfg as any).truncatedMeans = [6, 11];

      const result = buildMetricsRowFromManual(
        history,
        envCfg,
        defaultSeriesCfg,
      );

      // Regret sollte basierend auf truncatedMeans berechnet werden
      // Step 1: bestMean=11, reward=5, isOptimal=false → regret = 11-5 = 6
      // Step 2: bestMean=11, reward=10, isOptimal=true → regret = 0
      expect(result.regret).toBe(6);
    });

    it("behandelt envConfig ohne probs/means korrekt", () => {
      const history: ManualStep[] = [
        { action: 0, reward: 3, isOptimal: false },
      ];
      const envCfg: iEnvConfig = {
        type: "bernoulli",
        arms: 2,
      };

      const result = buildMetricsRowFromManual(
        history,
        envCfg,
        defaultSeriesCfg,
      );

      // Ohne probs sollte bestMean = 0 sein, daher kein Regret
      expect(result.regret).toBe(0);
    });
  });

  describe("buildSeriesFromManual", () => {
    const defaultSeriesCfg: iSeriesConfig = {
      id: "test",
      label: "Test Series",
      color: "#fff",
      visible: true,
    };

    it("generiert leere Series für leere History", () => {
      const history: ManualStep[] = [];
      const envCfg: iEnvConfig = {
        type: "bernoulli",
        arms: 2,
        probs: [0.5, 0.5],
      };

      const result = buildSeriesFromManual(history, envCfg, defaultSeriesCfg);

      expect(result.points.cumReward).toHaveLength(0);
      expect(result.points.avgReward).toHaveLength(0);
      expect(result.points.regret).toHaveLength(0);
      expect(result.points.bestRate).toHaveLength(0);
      expect(result.config).toEqual(defaultSeriesCfg);
    });

    it("berechnet kumulative Werte über Zeit", () => {
      const history: ManualStep[] = [
        { action: 0, reward: 10, isOptimal: true },
        { action: 0, reward: 5, isOptimal: true },
        { action: 1, reward: 3, isOptimal: false },
      ];
      const envCfg: iEnvConfig = {
        type: "gaussian",
        arms: 2,
        means: [10, 5],
        stdDev: [1, 1],
      };

      const result = buildSeriesFromManual(history, envCfg, defaultSeriesCfg);

      expect(result.points.cumReward).toHaveLength(3);
      expect(result.points.cumReward[0]).toEqual({ step: 1, y: 10 });
      expect(result.points.cumReward[1]).toEqual({ step: 2, y: 15 });
      expect(result.points.cumReward[2]).toEqual({ step: 3, y: 18 });
    });

    it("berechnet durchschnittliche Rewards über Zeit", () => {
      const history: ManualStep[] = [
        { action: 0, reward: 10, isOptimal: true },
        { action: 0, reward: 6, isOptimal: true },
      ];
      const envCfg: iEnvConfig = {
        type: "gaussian",
        arms: 2,
        means: [10, 5],
        stdDev: [1, 1],
      };

      const result = buildSeriesFromManual(history, envCfg, defaultSeriesCfg);

      expect(result.points.avgReward[0]).toEqual({ step: 1, y: 10 });
      expect(result.points.avgReward[1]).toEqual({ step: 2, y: 8 }); // (10+6)/2
    });

    it("berechnet Best Rate über Zeit", () => {
      const history: ManualStep[] = [
        { action: 1, reward: 1, isOptimal: true },
        { action: 0, reward: 0, isOptimal: false },
        { action: 1, reward: 1, isOptimal: true },
        { action: 1, reward: 1, isOptimal: true },
      ];
      const envCfg: iEnvConfig = {
        type: "bernoulli",
        arms: 2,
        probs: [0.3, 0.7],
      };

      const result = buildSeriesFromManual(history, envCfg, defaultSeriesCfg);

      expect(result.points.bestRate[0].y).toBe(1); // 1/1
      expect(result.points.bestRate[1].y).toBe(0.5); // 1/2
      expect(result.points.bestRate[2].y).toBeCloseTo(2 / 3); // 2/3
      expect(result.points.bestRate[3].y).toBe(0.75); // 3/4
    });

    it("berechnet Regret über Zeit", () => {
      const history: ManualStep[] = [
        { action: 0, reward: 5, isOptimal: false }, // Regret: 10-5 = 5
        { action: 1, reward: 10, isOptimal: true }, // Regret: 0
        { action: 0, reward: 7, isOptimal: false }, // Regret: 10-7 = 3
      ];
      const envCfg: iEnvConfig = {
        type: "gaussian",
        arms: 2,
        means: [5, 10],
        stdDev: [1, 1],
      };

      const result = buildSeriesFromManual(history, envCfg, defaultSeriesCfg);

      expect(result.points.regret[0].y).toBe(5);
      expect(result.points.regret[1].y).toBe(5); // 5 + 0
      expect(result.points.regret[2].y).toBe(8); // 5 + 0 + 3
    });
  });
});
