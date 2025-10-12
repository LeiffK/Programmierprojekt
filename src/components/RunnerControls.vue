<template>
  <section class="card">
    <div class="row one-line">
      <h2 class="title">Automatischer Lauf</h2>
      <div class="status" :class="statusClass">
        <span class="dot" />
        <span class="txt">{{ statusText }}</span>
      </div>
    </div>

    <div class="controls one-line" role="group" aria-label="Runner Controls">
      <div class="field">
        <label class="label">Gesamtsteps</label>
        <NumericStepper
          v-model="totalSteps"
          :min="1"
          :max="100000"
          :step="10"
        />
      </div>

      <div class="field">
        <label class="label">Schritte/Sekunde</label>
        <NumericStepper v-model="rate" :min="1" :max="240" :step="1" />
      </div>

      <div class="btn-cluster">
        <button
          class="btn btn-ghost btn-pill"
          type="button"
          :disabled="!canStep"
          @click="onStep"
        >
          +1 Schritt
        </button>
        <button
          class="btn btn-ghost btn-danger btn-pill"
          type="button"
          :disabled="!canToggle"
          @click="onReset"
        >
          Zurücksetzen
        </button>
        <button
          class="btn btn-pill"
          type="button"
          :disabled="!canToggle"
          @click="onToggleRun"
        >
          <span v-if="running">⏸ Pausieren</span>
          <span v-else>▶︎ Starten</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import NumericStepper from "./ui/NumericStepper.vue";
import { algorithmsRunner } from "../services/algorithmsRunner";
import type { iEnvConfig } from "../env/Domain/iEnvConfig";
import type { iBanditPolicyConfig } from "../algorithms/Domain/iBanditPolicyConfig";
import type { CustomPolicyRegistration } from "../algorithms/Domain/iCustomPolicyRegistration";

const props = defineProps<{
  envConfig: iEnvConfig | null;
  policyConfigs?: Partial<
    Record<
      "greedy" | "epsgreedy" | "ucb" | "thompson" | "gradient",
      iBanditPolicyConfig & Record<string, any>
    >
  > & { variants?: any; customPolicies?: CustomPolicyRegistration[] };
}>();

const emit = defineEmits<{ (e: "reset"): void }>();

const totalSteps = ref<number>(100);
const rate = ref<number>(5);

const running = ref(false);
const configured = ref(false);
const statusText = ref("Bereit");

const canStep = computed(() => !!props.envConfig);
const canToggle = computed(() => !!props.envConfig);

const statusClass = computed(() => ({
  running: running.value,
  paused: !running.value && configured.value,
  idle: !configured.value,
}));

let cfgTimer: number | null = null;
function ensureConfigured(immediate = false) {
  if (!props.envConfig) {
    configured.value = false;
    statusText.value = "Kein Environment";
    return;
  }
  const doConfig = () => {
    algorithmsRunner.configure({
      envConfig: props.envConfig!,
      totalSteps: totalSteps.value,
      rate: rate.value,
      policyConfigs: props.policyConfigs as any,
    });
    configured.value = true;
    statusText.value = running.value ? "Läuft" : "Konfiguriert";
  };
  if (immediate) {
    doConfig();
  } else {
    if (cfgTimer != null) window.clearTimeout(cfgTimer);
    cfgTimer = window.setTimeout(doConfig, 120) as unknown as number;
  }
}

watch(
  () => props.envConfig,
  () => ensureConfigured(),
);
watch(
  () => props.policyConfigs,
  () => ensureConfigured(),
  { deep: true },
);
watch(rate, () => ensureConfigured());
watch(totalSteps, () => ensureConfigured());
onMounted(() => ensureConfigured(true));

function onStart() {
  ensureConfigured(true);
  algorithmsRunner.start();
  running.value = true;
  statusText.value = "Läuft";
}
function onPause() {
  algorithmsRunner.pause();
  running.value = false;
  statusText.value = "Pausiert";
}
function onToggleRun() {
  running.value ? onPause() : onStart();
}
function onStep() {
  ensureConfigured(true);
  algorithmsRunner.stepOnce();
  statusText.value = "Manueller Schritt";
}
function onReset() {
  algorithmsRunner.stop("Reset");
  running.value = false;
  configured.value = false;
  statusText.value = "Zurückgesetzt";
  emit("reset");
}
</script>

<style scoped>
.row.one-line {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
  margin-bottom: 6px;
}
.title {
  margin: 0;
}
.status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #bbb;
}
.status .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #666;
}
.status.running .dot {
  background: #2563eb;
}
.status.paused .dot {
  background: #f59e0b;
}

.controls.one-line {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 200px;
}
.label {
  font-weight: 600;
  color: #cfcfcf;
}
.btn-cluster {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

/* Pill-Buttons (gleiches Pattern wie AdvancedSettings) */
.btn {
  height: 36px;
  padding: 0 12px;
  border: 1px solid #2d2d2d;
  background: #171717;
  color: #eaeaea;
  border-radius: 999px;
  cursor: pointer;
}
.btn-ghost {
  background: #161616;
}
.btn-danger {
  border-color: #553333;
  color: #ffbdbd;
}
.btn-pill {
  border-radius: 999px;
}

@media (max-width: 860px) {
  .btn-cluster {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
