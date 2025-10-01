<template>
  <section class="card">
    <h2>Automatischer Lauf (Algorithmen kommen später)</h2>

    <!-- Kopf: zwei einheitliche Stepper -->
    <div class="grid">
      <div>
        <NumericStepper
          v-model="totalSteps"
          label="Ziel-Iterationen (n)"
          :min="1"
          :step="1"
          @bump="
            (p) =>
              pushLog(`n ${p.delta > 0 ? 'erhöht' : 'verringert'} → ${p.value}`)
          "
        />
      </div>
      <div>
        <NumericStepper
          v-model="rate"
          label="Rate (n pro Sekunde)"
          :min="1"
          :step="1"
          @bump="
            (p) =>
              pushLog(
                `Rate ${p.delta > 0 ? 'erhöht' : 'verringert'} → ${p.value}/s`,
              )
          "
        />
      </div>

      <!-- Platzhalter-Spalte, damit das Grid visuell ruhig bleibt -->
      <div class="placeholder"></div>
    </div>

    <!-- Aktionsleiste -->
    <div class="actions">
      <div class="control-group group-4">
        <button
          class="group-btn"
          type="button"
          :disabled="!envId"
          @click="onConfigure"
        >
          Konfigurieren
        </button>

        <button
          class="group-btn"
          type="button"
          :disabled="!envId || running"
          @click="onStep"
        >
          +1 Schritt
        </button>

        <button
          class="group-btn primary"
          type="button"
          :disabled="!envId || running"
          @click="onStart"
        >
          Start
        </button>

        <button
          class="group-btn ghost"
          type="button"
          :disabled="!envId || !running"
          @click="onPause"
        >
          Pause
        </button>
      </div>

      <span class="muted status" v-if="statusText"
        >Status: {{ statusText }}</span
      >
    </div>

    <div class="out">
      <div class="label">Protokoll</div>
      <pre class="pre" style="max-height: 220px">{{ logText }}</pre>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import NumericStepper from "./ui/NumericStepper.vue";

const props = defineProps<{ envId: string | null; arms: number }>();

const totalSteps = ref<number>(100);
const rate = ref<number>(5);

const statusText = ref<string>(""); // „Bereit“, „Konfiguriert“, „Läuft“, „Pausiert“
const running = ref<boolean>(false); // steuert Start/Pause
const logs: string[] = [];
const logText = ref<string>("");

let worker: Worker | null = null;

watch(
  () => props.envId,
  (id) => {
    if (!id) {
      statusText.value = "Kein Environment";
      running.value = false;
      return;
    }
    ensureWorker();
    statusText.value = "Bereit";
  },
);

function ensureWorker() {
  if (worker) return;
  worker = new Worker(new URL("../workers/banditWorkers.ts", import.meta.url), {
    type: "module",
  });

  worker.addEventListener("message", (e: MessageEvent) => {
    const msg = e.data;

    switch (msg.type) {
      case "READY":
        pushLog("Worker bereit.");
        break;

      case "CONFIGURED":
        pushLog(
          `Konfiguriert: env=${msg.payload.envId.substring(0, 8)} steps=${msg.payload.totalSteps} rate=${msg.payload.rate}/s`,
        );
        statusText.value = "Konfiguriert";
        running.value = false; // falls zwischendrin geklickt wurde -> neutralisieren
        break;

      case "STARTED":
        statusText.value = "Läuft";
        running.value = true;
        pushLog("Lauf gestartet.");
        break;

      case "STOPPED": {
        const reason = msg.payload?.reason ?? "";
        const isPause =
          reason === "Manuell gestoppt" ||
          reason === "" ||
          reason.startsWith("Ziel");
        statusText.value = isPause ? "Pausiert" : "Gestoppt";
        running.value = false;
        pushLog(`Lauf angehalten. ${reason}`.trim());
        break;
      }

      case "REQUEST_ACTION":
        {
          //erweitern, sobald algorithmen implementiert sind.
        }
        break;

      case "RESULT":
        // später kommen hier mehrere Serien rein; heute reicht die Ausgabe
        pushLog(
          `Schritt ${msg.payload.step}: Arm ${msg.payload.action} → Reward ${msg.payload.reward.toFixed(2)} (${msg.payload.isOptimal ? "optimal" : "—"})`,
        );
        break;

      case "PROGRESS":
        pushLog(
          `Fortschritt: ${msg.payload.step}/${msg.payload.total} (rest ${msg.payload.remaining})`,
        );
        break;

      case "ERROR":
        pushError(msg.payload.message);
        running.value = false;
        break;

      default:
        pushError("Unbekannte Worker-Antwort.");
    }
  });
}

function onConfigure() {
  if (!props.envId) return;
  ensureWorker();
  running.value = false;
  pushLog(`Konfigurieren → n=${totalSteps.value}, rate=${rate.value}/s`);
  worker!.postMessage({
    type: "CONFIGURE",
    payload: {
      envId: props.envId,
      totalSteps: totalSteps.value,
      rate: rate.value,
    },
  });
}

function onStart() {
  if (!props.envId) return;
  ensureWorker();
  pushLog("Start");
  worker!.postMessage({ type: "START" });
}

function onPause() {
  if (!props.envId) return;
  ensureWorker();
  pushLog("Pause");
  worker!.postMessage({ type: "STOP" }); // Worker interpretiert „STOP“ als anhalten
}

function onStep() {
  if (!props.envId) return;
  ensureWorker();
  pushLog("Einzelschritt");
  worker!.postMessage({ type: "STEP" });
}

function pushLog(line: string) {
  logs.unshift(`• ${line}`);
  logText.value = logs.slice(0, 80).join("\n");
}
function pushError(line: string) {
  pushLog(`FEHLER: ${line}`);
}

onBeforeUnmount(() => {
  if (worker) {
    worker.terminate();
    worker = null;
  }
});
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}
.placeholder {
  /* einfach leer lassen, tut nur fürs Layout */
}

.control {
  height: 44px;
  width: 100%;
  background: #111;
  color: #eee;
  border: 1px solid #333;
  border-radius: 10px;
  padding: 0 12px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.control-group {
  height: 44px;
  width: 100%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: #111;
  border: 1px solid #333;
  border-radius: 10px;
  overflow: hidden;
}
.group-btn {
  height: 42px;
  background: #1a1a1a;
  color: #fff;
  border: 0;
  border-right: 1px solid #333;
  cursor: pointer;
  padding: 0 12px;
}
.group-btn:last-child {
  border-right: 0;
}
.group-btn.primary {
  background: #ff0000;
  border-right: 1px solid #ff0000;
}
.group-btn.ghost {
  background: #2a1b1b;
}
.group-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status {
  white-space: nowrap;
}
</style>
