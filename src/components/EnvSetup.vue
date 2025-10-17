<template>
  <section class="card">
    <div class="card-head">
      <h2>Environment <InfoTooltip text="Hier legst du fest, was getestet werden soll: Gaussian für messbare Werte wie Watchtime in Sekunden, Bernoulli für Ja/Nein-Entscheidungen wie Klicks. Die Anzahl Thumbnails bestimmt, wie viele verschiedene Varianten miteinander verglichen werden." /></h2>
      <div class="head-actions">
        <slot name="actions" />
      </div>
    </div>

    <div class="form-grid">
      <div class="field col-6">
        <label class="label">Environment-Typ</label>
        <div class="env-switch">
          <button
            type="button"
            class="env-btn"
            :class="{ active: local.type === 'gaussian' }"
            @click="local.type = 'gaussian'"
          >
            <svg class="env-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3v18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M7 16c0-1.5 1-3 2-3s2 1.5 3 0 1-3 2-3 2 1.5 3 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div class="env-text">
              <div class="env-title">Gaussian</div>
              <div class="env-subtitle">Watchtime</div>
            </div>
          </button>
          <button
            type="button"
            class="env-btn"
            :class="{ active: local.type === 'bernoulli' }"
            @click="local.type = 'bernoulli'"
          >
            <svg class="env-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 11l3 3L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div class="env-text">
              <div class="env-title">Bernoulli</div>
              <div class="env-subtitle">Click-Through-Rate</div>
            </div>
          </button>
        </div>
      </div>

      <div class="field col-6">
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
import InfoTooltip from "./InfoTooltip.vue";

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
.col-6 {
  grid-column: span 6;
}
.col-12 {
  grid-column: span 12;
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

.env-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.env-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  height: 46px;
  background: #1a1a1a;
  border: 2px solid #2a2a2a;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #ccc;
}

.env-btn:hover {
  background: #202020;
  border-color: #3a3a3a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.env-btn.active {
  background: linear-gradient(135deg, #1f2a44 0%, #1a2338 100%);
  border-color: #3a4a6c;
  color: #fff;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
}

.env-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.env-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.env-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.env-subtitle {
  font-size: 12px;
  opacity: 0.7;
}
</style>
