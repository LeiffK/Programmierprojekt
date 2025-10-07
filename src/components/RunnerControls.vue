<template>
  <section class="card">
    <!-- Titel + Status rechts daneben -->
    <div class="card-head head-with-status">
      <h2>Automatischer Lauf</h2>
      <div class="head-status" :class="statusClass" title="Runner-Status">
        <span class="dot" />
        <span class="txt">{{ statusText }}</span>
      </div>
    </div>

    <!-- Grid wie im EnvSetup -->
    <div class="form-grid">
      <div class="col-4">
        <NumericStepper
          v-model="totalSteps"
          label="Ziel-Iterationen (n)"
          :min="1"
          :step="1"
          @bump="
            (p) =>
              debug.log(
                `n ${p.delta > 0 ? 'erhöht' : 'verringert'} → ${p.value}`,
                'runner',
              )
          "
        />
      </div>

      <div class="col-4">
        <NumericStepper
          v-model="rate"
          label="Rate (Schritte/Sek.)"
          :min="1"
          :step="1"
          @bump="
            (p) =>
              debug.log(
                `Rate ${p.delta > 0 ? 'erhöht' : 'verringert'} → ${p.value}/s`,
                'runner',
              )
          "
        />
      </div>

      <div class="col-4"></div>
    </div>

    <div class="actions">
      <div class="control-row">
        <!-- EnvSetup-Style: segmentierte Gruppe -->
        <div class="control-group group-2">
          <button
            class="group-btn"
            type="button"
            :disabled="!envId"
            @click="onConfigure"
            title="Konfiguration aus Environment übernehmen"
          >
            Konfigurieren
          </button>

          <button
            class="group-btn"
            type="button"
            :disabled="!canStep"
            @click="onStep"
            title="Einen Schritt ausführen"
          >
            +1 Schritt
          </button>
        </div>

        <!-- Play/Pause: runder Button, auf gleicher Zeile, vertikal zentriert -->
        <div class="fab-inline">
          <button
            class="fab"
            :class="fabClass"
            type="button"
            :disabled="!canToggle"
            @click="onToggleRun"
            :aria-label="running ? 'Pausieren' : 'Starten'"
            :title="running ? 'Pausieren' : 'Starten'"
          >
            <!-- Play -->
            <svg
              v-if="!running"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
            <!-- Pause -->
            <svg
              v-else
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
            >
              <path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor" />
            </svg>
          </button>
          <span class="fab-label">{{ running ? "Pause" : "Start" }}</span>
        </div>
      </div>
    </div>
  </section>
  <section class="card">
    <div class="card-head head-with-toggle">
      <h2>Eigenen Algorithmus</h2>
      <div class="head-actions">
        <button
          class="toggle-btn"
          @click="showCustomEditor = !showCustomEditor"
        >
          {{ showCustomEditor ? "Verbergen" : "Einblenden" }}
        </button>
      </div>
    </div>

    <transition name="fade">
      <div v-if="showCustomEditor" class="editor-body">
        <AlgorithmEditor @policyLoaded="onCustomPolicyLoaded" />
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from "vue";
import NumericStepper from "./ui/NumericStepper.vue";
import { algorithmsRunner } from "../services/algorithmsRunner";
import { getEnvSnapshot } from "../api/banditClient";
import AlgorithmEditor from "@/components/AlgorithmEditor.vue";
import { debug } from "../services/debugStore";
const showCustomEditor = ref(false);
const customPolicy = ref<any | null>(null);

const props = defineProps<{ envId: string | null; arms: number }>();

const totalSteps = ref<number>(100);
const rate = ref<number>(5);

const statusText = ref<string>("Bereit");
const configured = ref<boolean>(false);
const running = ref<boolean>(false);
const currentStep = ref<number>(0);

/* Runner-Events → nur UI-State, Logging zentral via attachRunner */
const off = algorithmsRunner.on((msg) => {
  switch (msg.type) {
    case "READY":
      statusText.value = "Bereit";
      break;
    case "CONFIGURED":
      configured.value = true;
      running.value = false;
      currentStep.value = 0;
      statusText.value = "Konfiguriert";
      break;
    case "STARTED":
      running.value = true;
      statusText.value = "Läuft";
      break;
    case "PAUSED":
      running.value = false;
      statusText.value = "Pausiert";
      break;
    case "STOPPED":
      running.value = false;
      statusText.value = "Gestoppt";
      break;
    case "RESULT":
      currentStep.value = msg.payload.step;
      break;
    case "LOG":
      // Logging übernimmt attachRunner
      break;
    case "PROGRESS":
      break;
    case "ERROR":
      debug.error(msg.payload.message);
      break;
  }
});

const canStart = computed(
  () =>
    configured.value && !running.value && currentStep.value < totalSteps.value,
);
const canStep = computed(
  () =>
    configured.value && !running.value && currentStep.value < totalSteps.value,
);
const canToggle = computed(() => running.value || canStart.value);

/* Statusklassen */
const statusClass = computed(() => {
  if (running.value) return "is-running";
  if (
    configured.value &&
    currentStep.value >= totalSteps.value &&
    totalSteps.value > 0
  )
    return "is-stopped";
  if (configured.value && !running.value && currentStep.value > 0)
    return "is-paused";
  return "is-ready";
});
const fabClass = computed(() => ({
  running: running.value,
  paused: !running.value && configured.value && currentStep.value > 0,
}));

/* Konfiguration übernehmen (Logging via Runner-Events/attachRunner) */
async function onConfigure() {
  if (!props.envId) {
    statusText.value = "Kein Environment";
    debug.log("Kein Environment vorhanden.", "env");
    return;
  }
  const snap: any = await getEnvSnapshot(props.envId);
  algorithmsRunner.configure({
    envConfig: snap.config,
    totalSteps: totalSteps.value,
    rate: rate.value,
  });

  configured.value = true;
  running.value = false;
  currentStep.value = 0;
  statusText.value = "Konfiguriert";
}

/* Start/Pause */
function onStart() {
  if (canStart.value) algorithmsRunner.start();
}
function onPause() {
  algorithmsRunner.pause();
}
function onToggleRun() {
  running.value ? onPause() : onStart();
}

/* Einzelschritt */
function onStep() {
  if (!configured.value) return;
  if (running.value) return;
  if (currentStep.value >= totalSteps.value) return;
  algorithmsRunner.stepOnce();
}

onBeforeUnmount(() => {
  off();
  algorithmsRunner.pause();
});
</script>

<style scoped>
/* Kopf mit Status rechts */
.head-with-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.head-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1;
  border: 1px solid #2a2a2a;
  background: rgba(255, 255, 255, 0.04);
  color: #d9d9d9;
}
.head-status .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9ca3af;
  box-shadow: 0 0 0 2px rgba(156, 163, 175, 0.25);
}
.head-status.is-ready .dot {
  background: #9ca3af;
  box-shadow: 0 0 0 2px rgba(156, 163, 175, 0.25);
}
.head-status.is-running .dot {
  background: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25);
}
.head-status.is-paused .dot {
  background: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.25);
}
.head-status.is-stopped .dot {
  background: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.25);
}

/* Grid analog EnvSetup */
.form-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 12px;
  align-items: end;
}
.col-4 {
  grid-column: span 4;
}
@media (max-width: 980px) {
  .col-4 {
    grid-column: 1 / -1;
  }
}

/* Actions-Zeile */
.actions {
  margin-top: 12px;
}
.control-row {
  display: flex;
  align-items: center; /* vertikal zentriert: FAB auf einer Ebene */
  gap: 14px;
}

/* Segmentierte Gruppe – EnvSetup-Style */
.control-group {
  height: 44px;
  flex: 1;
  display: grid;
  background: #111;
  border: 1px solid #333;
  border-radius: 10px;
  overflow: hidden;
}
.group-2 {
  grid-template-columns: 1fr 1fr;
}

.group-btn {
  height: 42px;
  background: #1a1a1a;
  color: #fff;
  border: 0;
  border-right: 1px solid #333;
  cursor: pointer;
  padding: 0 12px;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}
.group-btn:last-child {
  border-right: 0;
}
.group-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* FAB + Label inline */
.fab-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* Play/Pause: runder Button (YT-rot idle, Blau running, Amber pausiert) */
.fab {
  --yt-red: #ff0000;
  --run-blue: #2563eb;
  --pause-amber: #f59e0b;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  border: 2px solid var(--yt-red);
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: saturate(140%) blur(6px);
  -webkit-backdrop-filter: saturate(140%) blur(6px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--yt-red);
  box-shadow:
    0 0 0 4px rgba(255, 0, 0, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition:
    transform 0.06s ease,
    box-shadow 0.2s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    background-color 0.15s ease;
}
.fab:not(:disabled):hover {
  box-shadow:
    0 0 0 6px rgba(255, 0, 0, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
.fab:active:not(:disabled) {
  transform: scale(0.97);
}
.fab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fab.running {
  color: var(--run-blue);
  border-color: var(--run-blue);
  box-shadow:
    0 0 0 4px rgba(37, 99, 235, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
.fab.paused {
  color: var(--pause-amber);
  border-color: var(--pause-amber);
  box-shadow:
    0 0 0 4px rgba(245, 158, 11, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.fab-label {
  font-size: 12px;
  color: #cfcfcf;
  user-select: none;
}

/* Log-Ausgabe */
.out .label {
  font-size: 12px;
  opacity: 0.7;
}
.pre {
  background: #151515;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 10px;
  overflow: auto;
}
.card {
  background: #111;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  padding: 16px;
  color: #fff;
}

/* Kopfzeile mit Buttons rechts */
.card-head.head-with-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

/* Chip (z. B. "3 Serien") */
.chip {
  background: #1f1f1f;
  border: 1px solid #333;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  color: #bbb;
  margin-right: 8px;
}

/* Toggle Button (Einblenden / Verbergen) */
.toggle-btn {
  background: transparent;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 4px 10px;
  color: #ddd;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.toggle-btn:hover {
  background: #222;
}

/* Card Body (Inhalt beim Aufklappen) */
.card-body {
  margin-top: 16px;
  background: #181818;
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #2a2a2a;
}

/* Fade-Transition fürs sanfte Einblenden */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
