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
        <NumericStepper v-model="totalSteps" :min="1" :max="100000" :step="10" />
      </div>

      <div class="field">
        <label class="label">Schritte/Sekunde</label>
        <NumericStepper v-model="rate" :min="1" :max="240" :step="1" />
      </div>

      <div class="btn-cluster">
        <button class="btn" type="button" :disabled="!canStep" @click="onStep">
          +1 Schritt
        </button>

        <button class="btn danger" type="button" :disabled="!canToggle" @click="onReset">
          Zurücksetzen
        </button>

        <button class="btn primary" type="button" :disabled="!canToggle" @click="onToggleRun">
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
import { getEnvSnapshot } from "../api/banditClient";
import { debug } from "../services/debugStore";

const props = defineProps<{
  envId: string | null;
  arms: number;
  policyConfigs?: any;
}>();

const emit = defineEmits<{ (e: "reset"): void }>();

const totalSteps = ref<number>(100);
const rate = ref<number>(5);

const running = ref(false);
const configured = ref(false);
const statusText = ref("Bereit");

const canStep = computed(() => !!props.envId);
const canToggle = computed(() => !!props.envId);

const statusClass = computed(() => ({
  running: running.value,
  paused: !running.value && configured.value,
  idle: !configured.value,
}));

/* Auto-Configuration */
let cfgTimer: number | null = null;
async function ensureConfigured(immediate = false) {
  if (!props.envId) { configured.value = false; statusText.value = "Kein Environment"; return; }

  const doConfig = async () => {
    const snap: any = await getEnvSnapshot(props.envId!);
    algorithmsRunner.configure({
      envId: props.envId!,
      envConfig: snap.config,
      totalSteps: totalSteps.value,
      rate: rate.value,
      policyConfigs: props.policyConfigs,
    });
    configured.value = true;
    statusText.value = running.value ? "Läuft" : "Konfiguriert";
    debug.log("Runner automatisch konfiguriert.", "runner");
  };

  if (immediate) await doConfig();
  else {
    if (cfgTimer != null) window.clearTimeout(cfgTimer);
    cfgTimer = window.setTimeout(() => void doConfig(), 150) as unknown as number;
  }
}
watch(() => props.envId, () => ensureConfigured());
watch(() => props.policyConfigs, () => ensureConfigured(), { deep: true });
watch(rate, () => ensureConfigured());
watch(totalSteps, () => ensureConfigured());
onMounted(() => ensureConfigured(true));

/* Controls */
async function onStart() { await ensureConfigured(true); algorithmsRunner.start(); running.value = true; statusText.value = "Läuft"; }
function onPause() { algorithmsRunner.pause(); running.value = false; statusText.value = "Pausiert"; }
function onToggleRun() { running.value ? onPause() : onStart(); }
async function onStep() { await ensureConfigured(true); await algorithmsRunner.stepOnce(); statusText.value = "Manueller Schritt"; }
function onReset() { algorithmsRunner.stop("Reset"); running.value = false; configured.value = false; statusText.value = "Zurückgesetzt"; emit("reset"); }
</script>

<style scoped>
:host { --control-h: 44px; --btn-radius: 8px; }

.row.one-line { display:flex; align-items:center; gap:8px; justify-content:space-between; margin-bottom:6px; }
.title { margin:0; }
.status { display:flex; align-items:center; gap:8px; font-weight:600; color:#bbb; }
.status .dot { width:8px; height:8px; border-radius:50%; background:#666; }
.status.running .dot { background:#2563eb; }
.status.paused  .dot { background:#f59e0b; }

.controls.one-line { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.field { display:flex; flex-direction:column; gap:6px; min-width:220px; }
.label { font-weight:600; color:#cfcfcf; }

.btn-cluster { display:flex; align-items:center; gap:10px; margin-left:auto; }

/* Rechteckige Buttons mit sanfter Rundung (wie Input) */
.btn {
  height: var(--control-h);
  padding: 0 16px;
  min-width: 140px;
  display:inline-flex; align-items:center; justify-content:center;
  background:#1a1a1a;
  color:#eaeaea;
  border:1px solid #333;
  border-radius: var(--btn-radius);
  cursor:pointer;
}
.btn:hover { background:#1c1c1c; border-color:#3a3a3a; }
.btn:active { background:#181818; }
.btn:disabled { opacity:.6; cursor:not-allowed; }

.btn.primary  { background:#1d2a44; border-color:#2b3f66; color:#d6e4ff; }
.btn.primary:hover { background:#213152; border-color:#375183; }
.btn.danger   { border-color:#553333; color:#ffbdbd; background:#1a1414; }
.btn.danger:hover { background:#201616; border-color:#6a3c3c; }

@media (max-width: 860px) {
  .btn-cluster { width:100%; justify-content:flex-end; }
}
</style>