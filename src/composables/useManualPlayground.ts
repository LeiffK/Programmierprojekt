import { computed, ref, type Ref } from "vue";
import type { ManualStep } from "../domain/iHistory";
import type { iEnvConfig } from "../env/Domain/iEnvConfig";
import type { iBanditEnv } from "../env/Domain/iBanditEnv";
import { BernoulliBanditEnv } from "../env/BernoulliBanditEnv";
import { GaussianBanditEnv } from "../env/GaussianBanditEnv";
import { algorithmsRunner } from "../services/algorithmsRunner";

interface ManualPlaygroundOptions {
  form: Ref<iEnvConfig>;
  debugEnabled: Ref<boolean>;
  lastEventText: Ref<string>;
}

export function useManualPlayground(options: ManualPlaygroundOptions) {
  const { form, debugEnabled, lastEventText } = options;

  const manualEnv = ref<iBanditEnv | null>(null);
  const manualHistory = ref<ManualStep[]>([]);
  const manualCounts = ref<number[]>([]);
  const busy = ref(false);

  function initManualEnv() {
    const baseConfig: iEnvConfig = { ...form.value };
    manualEnv.value =
      baseConfig.type === "bernoulli"
        ? new BernoulliBanditEnv({ ...baseConfig })
        : new GaussianBanditEnv({ ...baseConfig });
    manualHistory.value = [];
    manualCounts.value = Array.from({ length: form.value.arms ?? 0 }, () => 0);
  }

  async function handleManualPick(actionIndex: number) {
    if (!manualEnv.value) return;
    busy.value = true;
    try {
      const result = manualEnv.value.pull(actionIndex);
      manualHistory.value.push({
        action: result.action,
        reward: result.reward,
        isOptimal: result.isOptimal,
      });
      manualCounts.value[actionIndex] =
        (manualCounts.value[actionIndex] || 0) + 1;

      const status = algorithmsRunner.getStatus();
      if (status === "CONFIGURED" || status === "PAUSED") {
        algorithmsRunner.stepOnce();
      }

      const rewardText =
        manualEnv.value.config.type === "bernoulli"
          ? result.reward.toFixed(0)
          : `${result.reward.toFixed(2)}s`;
      const suffix =
        debugEnabled.value && result.isOptimal ? " - optimal" : "";
      lastEventText.value = `Manuell: Arm ${
        actionIndex + 1
      } - Reward ${rewardText}${suffix}`;
    } finally {
      busy.value = false;
    }
  }

  function onEnvLog(message: string) {
    const looksJson = /^\s*{[\s\S]*}\s*$/.test(String(message));
    if (looksJson && !debugEnabled.value) return;
    lastEventText.value = String(message);
  }

  const manualEstimates = computed<number[]>(() => {
    const armCount = form.value.arms ?? 0;
    const sum = Array(armCount).fill(0);
    const cnt = Array(armCount).fill(0);
    for (const entry of manualHistory.value) {
      sum[entry.action] += entry.reward;
      cnt[entry.action] += 1;
    }
    return sum.map((s, i) => (cnt[i] ? s / cnt[i] : 0));
  });

  function estimateText(index: number) {
    const count = manualCounts.value[index] || 0;
    if (!count) return "-";
    const estimate = manualEstimates.value[index];
    return form.value.type === "bernoulli"
      ? `${(estimate * 100).toFixed(1)}%`
      : `${estimate.toFixed(0)}s`;
  }

  function truthText(index: number) {
    const cfg = manualEnv.value?.config;
    if (!cfg) return "-";
    if (cfg.type === "bernoulli") {
      const p = cfg.probs?.[index];
      return p != null ? `${(p * 100).toFixed(1)}%` : "-";
    }
    const mu = cfg.means?.[index];
    const sd = cfg.stdDev?.[index] ?? (cfg as any)?.sigma?.[index];
    return mu != null && sd != null
      ? `${(+mu).toFixed(0)}s ~ ${Math.max(+sd, 0).toFixed(0)}s`
      : "-";
  }

  return {
    manualEnv,
    manualHistory,
    manualCounts,
    manualEstimates,
    busy,
    initManualEnv,
    handleManualPick,
    onEnvLog,
    estimateText,
    truthText,
  };
}
