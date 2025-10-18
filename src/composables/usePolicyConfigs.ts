import { ref, watch, type Ref } from "vue";
import type { iEnvConfig } from "../env/Domain/iEnvConfig";
import type { iCustomPolicyRegistration } from "../algorithms/Domain/iCustomPolicyRegistration";

type PolicyConfigs = {
  greedy: {
    optimisticInitialValue: number;
    variants: Array<{ optimisticInitialValue: number }>;
  };
  epsgreedy: {
    epsilon: number;
    optimisticInitialValue: number;
    variants: Array<{ epsilon: number; optimisticInitialValue: number }>;
  };
  gradient: {
    alpha: number;
    optimisticInitialValue: number;
    variants: Array<{ alpha: number; optimisticInitialValue: number }>;
  };
  thompson: {
    alpha: number;
    beta: number;
    priorMean: number;
    priorVariance: number;
    observationVariance: number;
    optimisticInitialValue: number;
    variants: Array<{
      alpha?: number;
      beta?: number;
      priorMean?: number;
      priorVariance?: number;
      observationVariance?: number;
      optimisticInitialValue?: number;
    }>;
  };
  customPolicies: iCustomPolicyRegistration[];
  [key: string]: any;
};

export function usePolicyConfigs(form: Ref<iEnvConfig>) {
  const policyConfigs = ref<PolicyConfigs>({
    greedy: {
      optimisticInitialValue: 100,
      variants: [{ optimisticInitialValue: 100 }],
    },
    epsgreedy: {
      epsilon: 0.1,
      optimisticInitialValue: 150,
      variants: [{ epsilon: 0.1, optimisticInitialValue: 150 }],
    },
    gradient: {
      alpha: 0.1,
      optimisticInitialValue: form.value?.type === "bernoulli" ? 0.99 : 0,
      variants: [
        {
          alpha: 0.1,
          optimisticInitialValue: form.value?.type === "bernoulli" ? 0.99 : 0,
        },
      ],
    },
    thompson: {
      alpha: 1,
      beta: 1,
      priorMean: 0,
      priorVariance: 1,
      observationVariance: 1,
      optimisticInitialValue: form.value?.type === "bernoulli" ? 0.99 : 0,
      variants: [
        {
          alpha: 1,
          beta: 1,
          priorMean: 0,
          priorVariance: 1,
          observationVariance: 1,
          optimisticInitialValue:
            form.value?.type === "bernoulli" ? 0.99 : 0,
        },
      ],
    },
    customPolicies: [],
  });

  const lastPolicyEnvType = ref<iEnvConfig["type"] | null>(null);

  function adjustPolicyDefaultsForEnv(type: iEnvConfig["type"]) {
    const current = policyConfigs.value ?? {};
    const greedy = { ...(current.greedy ?? {}) };
    const eps = { ...(current.epsgreedy ?? {}) };
    const gradient = { ...(current.gradient ?? {}) };
    const thompson = { ...(current.thompson ?? {}) };

    const ensureAlpha = (val?: number, fallback = 0.1) => {
      const n = Number(val);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };
    const ensurePositive = (val?: number, fallback = 1) => {
      const n = Number(val);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };

    if (type === "bernoulli") {
      const clamp01 = (val?: number, fallback = 0.99) => {
        if (val == null || Number.isNaN(val)) return fallback;
        return Math.max(0.01, Math.min(0.99, val));
      };
      greedy.optimisticInitialValue = clamp01(greedy.optimisticInitialValue);
      const greedyVariantsSrc =
        Array.isArray(greedy.variants) && greedy.variants.length
          ? greedy.variants
          : [{ optimisticInitialValue: greedy.optimisticInitialValue }];
      greedy.variants = greedyVariantsSrc.map((v: any) => ({
        ...v,
        optimisticInitialValue: clamp01(
          v.optimisticInitialValue,
          greedy.optimisticInitialValue,
        ),
      }));
      eps.optimisticInitialValue = clamp01(eps.optimisticInitialValue);
      const baseOiv = eps.optimisticInitialValue;
      const sourceVariants =
        Array.isArray(eps.variants) && eps.variants.length
          ? eps.variants
          : [{ epsilon: eps.epsilon ?? 0.1, optimisticInitialValue: baseOiv }];
      eps.variants = sourceVariants.map((variant: any) => ({
        ...variant,
        optimisticInitialValue: clamp01(
          variant.optimisticInitialValue,
          baseOiv,
        ),
      }));

      gradient.alpha = ensureAlpha(gradient.alpha, 0.1);
      gradient.optimisticInitialValue = clamp01(
        gradient.optimisticInitialValue,
        0.99,
      );
      const gradientVariantsSrc =
        Array.isArray(gradient.variants) && gradient.variants.length
          ? gradient.variants
          : [
              {
                alpha: gradient.alpha,
                optimisticInitialValue: gradient.optimisticInitialValue,
              },
            ];
      gradient.variants = gradientVariantsSrc.map((variant: any) => ({
        ...variant,
        alpha: ensureAlpha(variant?.alpha, gradient.alpha),
        optimisticInitialValue: clamp01(
          variant?.optimisticInitialValue,
          gradient.optimisticInitialValue,
        ),
      }));

      thompson.alpha = ensurePositive(thompson.alpha, 1);
      thompson.beta = ensurePositive(thompson.beta, 1);
      thompson.optimisticInitialValue = clamp01(
        thompson.optimisticInitialValue,
        0.99,
      );
      const thompsonVariantsSrc =
        Array.isArray(thompson.variants) && thompson.variants.length
          ? thompson.variants
          : [
              {
                alpha: thompson.alpha,
                beta: thompson.beta,
                optimisticInitialValue: thompson.optimisticInitialValue,
              },
            ];
      thompson.variants = thompsonVariantsSrc.map((variant: any) => ({
        ...variant,
        alpha: ensurePositive(variant?.alpha, thompson.alpha),
        beta: ensurePositive(variant?.beta, thompson.beta),
        optimisticInitialValue: clamp01(
          variant?.optimisticInitialValue,
          thompson.optimisticInitialValue,
        ),
        priorMean: Number.isFinite(Number(variant?.priorMean))
          ? Number(variant?.priorMean)
          : thompson.priorMean ?? 0,
        priorVariance: ensurePositive(
          variant?.priorVariance,
          thompson.priorVariance ?? 1,
        ),
        observationVariance: ensurePositive(
          variant?.observationVariance,
          thompson.observationVariance ?? 1,
        ),
      }));
    } else {
      const ensureHigh = (val?: number, fallback = 100) => {
        if (val == null) return fallback;
        return val > 1 ? val : fallback;
      };
      greedy.optimisticInitialValue = ensureHigh(
        greedy.optimisticInitialValue,
        100,
      );
      const greedyVariantsSrc =
        Array.isArray(greedy.variants) && greedy.variants.length
          ? greedy.variants
          : [{ optimisticInitialValue: greedy.optimisticInitialValue }];
      greedy.variants = greedyVariantsSrc.map((v: any) => ({
        ...v,
        optimisticInitialValue: ensureHigh(
          v.optimisticInitialValue,
          greedy.optimisticInitialValue,
        ),
      }));
      const baseOiv = ensureHigh(eps.optimisticInitialValue, 150);
      eps.optimisticInitialValue = baseOiv;
      const sourceVariants =
        Array.isArray(eps.variants) && eps.variants.length
          ? eps.variants
          : [{ epsilon: eps.epsilon ?? 0.1, optimisticInitialValue: baseOiv }];
      eps.variants = sourceVariants.map((variant: any) => ({
        ...variant,
        optimisticInitialValue: ensureHigh(
          variant.optimisticInitialValue,
          baseOiv,
        ),
      }));

      const ensureNonNegative = (val?: number, fallback = 0) => {
        if (val == null || Number.isNaN(val)) return fallback;
        return val;
      };
      gradient.alpha = ensureAlpha(gradient.alpha, 0.1);
      const baseGradOiv = ensureNonNegative(gradient.optimisticInitialValue, 0);
      gradient.optimisticInitialValue = baseGradOiv;
      const gradientVariantsSrc =
        Array.isArray(gradient.variants) && gradient.variants.length
          ? gradient.variants
          : [
              {
                alpha: gradient.alpha,
                optimisticInitialValue: baseGradOiv,
              },
            ];
      gradient.variants = gradientVariantsSrc.map((variant: any) => ({
        ...variant,
        alpha: ensureAlpha(variant?.alpha, gradient.alpha),
        optimisticInitialValue: ensureNonNegative(
          variant?.optimisticInitialValue,
          baseGradOiv,
        ),
      }));

      thompson.priorMean = ensureNonNegative(thompson.priorMean, 0);
      thompson.priorVariance = ensurePositive(thompson.priorVariance, 1);
      thompson.observationVariance = ensurePositive(
        thompson.observationVariance,
        1,
      );
      thompson.optimisticInitialValue = ensureNonNegative(
        thompson.optimisticInitialValue,
        0,
      );
      const thompsonVariantsSrc =
        Array.isArray(thompson.variants) && thompson.variants.length
          ? thompson.variants
          : [
              {
                priorMean: thompson.priorMean,
                priorVariance: thompson.priorVariance,
                observationVariance: thompson.observationVariance,
                optimisticInitialValue: thompson.optimisticInitialValue,
              },
            ];
      thompson.variants = thompsonVariantsSrc.map((variant: any) => ({
        ...variant,
        priorMean: ensureNonNegative(variant?.priorMean, thompson.priorMean),
        priorVariance: ensurePositive(
          variant?.priorVariance,
          thompson.priorVariance,
        ),
        observationVariance: ensurePositive(
          variant?.observationVariance,
          thompson.observationVariance,
        ),
        optimisticInitialValue: ensureNonNegative(
          variant?.optimisticInitialValue,
          thompson.optimisticInitialValue,
        ),
        alpha: ensurePositive(variant?.alpha, thompson.alpha ?? 1),
        beta: ensurePositive(variant?.beta, thompson.beta ?? 1),
      }));
    }

    policyConfigs.value = {
      ...current,
      greedy: { ...current.greedy, ...greedy },
      epsgreedy: { ...current.epsgreedy, ...eps },
      gradient: { ...current.gradient, ...gradient },
      thompson: { ...current.thompson, ...thompson },
    };
  }


  watch(
    () => form.value.type,
    (type) => {
      if (!type || lastPolicyEnvType.value === type) return;
      lastPolicyEnvType.value = type;
      adjustPolicyDefaultsForEnv(type);
    },
    { immediate: true },
  );

  return {
    policyConfigs,
    adjustPolicyDefaultsForEnv,
  };
}
