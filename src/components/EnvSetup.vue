<template>
  <section class="card">
    <div class="card-head">
      <h2>Environment</h2>
      <div class="head-actions">
        <slot name="actions" />
      </div>
    </div>

    <div class="form-grid">
      <div class="field col-4">
        <label class="label">Typ</label>
        <select v-model="local.type" class="control">
          <option value="gaussian">Gaussian · Watchtime</option>
          <option value="bernoulli">Bernoulli · CTR</option>
        </select>
      </div>

      <div class="field col-4">
        <label class="label">Anzahl Thumbnails</label>
        <NumericStepper v-model="local.arms" :min="1" :max="64" :step="1" />
      </div>

      <!-- Seed/μ/σ wurden aus EnvSetup entfernt; Bedienung liegt nun in AdvancedSettings -->
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import type { iEnvConfig } from "../env/Domain/iEnvConfig.js";
import { initEnv } from "../api/banditClient";
import NumericStepper from "./ui/NumericStepper.vue";

const props = defineProps<{ modelValue: iEnvConfig; busy: boolean }>();
const emit = defineEmits<{
  (e: "update:modelValue", v: iEnvConfig): void;
  (e: "inited", payload: { envId: string; optimalAction: number }): void;
  (e: "log", msg: string): void;
}>();

const local = reactive<iEnvConfig>({
  type: "gaussian",
  arms: props.modelValue.arms ?? 6,
  probs: props.modelValue.probs,
  means: props.modelValue.means,
  stdDev: props.modelValue.stdDev,
  seed: props.modelValue.seed ?? 12345,
});

watch(
  () => props.modelValue,
  (v) => Object.assign(local, v),
  { deep: true },
);

watch(
  local,
  (v) => {
    emit("update:modelValue", { ...v });
  },
  { deep: true },
);

watch(
  () => local.type,
  (type) => {
    if (type === "bernoulli") {
      local.means = undefined;
      local.stdDev = undefined;
    } else {
      local.probs = undefined;
    }
  },
);

const envId = computed(() => (local as any)._envId as string | undefined);

/* Auto-Init: bei jeder relevanten Änderung initialisieren (debounced) */
let _initTimer: number | null = null;
function scheduleInit() {
  if (_initTimer != null) window.clearTimeout(_initTimer);
  _initTimer = window.setTimeout(() => {
    init();
  }, 300) as unknown as number;
}
watch(
  () => [
    local.type,
    local.arms,
    local.seed,
    local.means,
    local.stdDev,
    local.probs,
  ],
  () => scheduleInit(),
  { deep: true },
);
// initial beim Mount einmal
scheduleInit();

/* Init-Call zum Backend */
async function init() {
  const payload =
    local.type === "bernoulli"
      ? { ...local, means: undefined, stdDev: undefined }
      : { ...local, probs: undefined };
  const res = await initEnv(payload);
  (local as any)._envId = res.envId;
  emit("inited", res);
  emit("log", JSON.stringify({ optimalAction: res.optimalAction }, null, 2));
}
</script>

<style scoped>
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.head-actions {
  display: flex;
  gap: 8px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.col-4 {
  grid-column: span 4;
}
.label {
  font-weight: 600;
}
.control {
  height: 42px;
  background: #1a1a1a;
  border: 1px solid #333;
  color: #fff;
  padding: 0 12px;
  border-radius: 6px;
}
</style>
