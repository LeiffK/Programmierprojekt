<template>
  <section class="card">
    <h2>Automatischer Lauf (Algorithmen kommen später)</h2>

    <!-- Kopf: einheitliche Eingabekomponenten -->
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
      <div>
        <label class="label">Algorithmus</label>
        <select v-model="algoId" class="control">
          <option value="" disabled>Bitte wählen</option>
          <option value="greedy" disabled>Greedy (bald)</option>
          <option value="epsgreedy" disabled>Epsilon-Greedy (bald)</option>
          <option value="ucb1" disabled>UCB1 (bald)</option>
          <option value="thompson" disabled>Thompson (bald)</option>
          <option value="gradient" disabled>Gradient (bald)</option>
          <option value="custom" disabled>Custom (bald)</option>
        </select>
      </div>
    </div>

    <!-- Aktionsleiste: eine Gruppe, vier Buttons im selben Stil -->
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

/**
 * - running steuert die Aktivierung von Start/Pause
 * - busy diente früher als Blocker, hat aber Start nach Pause „kleben“ lassen.
 *   Wir nutzen jetzt running für die UI-Logik und setzen busy hart zurück.
 */

const props = defineProps<{ envId: string | null; arms: number }>();

const totalSteps = ref<number>(100);
const rate = ref<number>(5);
const algoId = ref<string>("");

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

watch(algoId, (v) => pushLog(`Algorithmus gewählt: ${v || "—"}`));

function ensureWorker() {
  if (worker) return;
  worker = new Worker(new URL("../workers/banditWorker.ts", import.meta.url), {
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
        // Konfigurieren setzt den Lauf zurück (falls jemand mitten drin klickt)
        running.value = false;
        break;

      case "STARTED":
        statusText.value = "Läuft";
        running.value = true;
        pushLog("Lauf gestartet.");
        break;

      case "STOPPED":
        // STOPPED kann „Pause“ oder „Ende“ sein – wir differenzieren über reason
        const reason = msg.payload?.reason ?? "";
        const isPause =
          reason === "Manuell gestoppt" ||
          reason === "" ||
          reason.startsWith("Ziel");
        // pragmatisch: bei „Manuell gestoppt“ zeigen wir „Pausiert“
        statusText.value = isPause ? "Pausiert" : "Gestoppt";
        running.value = false; // wichtig: Start danach wieder aktiv
        pushLog(`Lauf angehalten. ${reason}`.trim());
        break;

      case "REQUEST_ACTION":
        // später mit Algo befüllen – bis dahin: sauber abbrechen
        if (!algoId.value) {
          pushError("Kein Algorithmus ausgewählt. Vorgang wird beendet.");
          worker?.postMessage({ type: "STOP" });
        } else {
          pushError(`Algorithmus „${algoId.value}“ ist noch nicht verfügbar.`);
          worker?.postMessage({ type: "STOP" });
        }
        break;

      case "RESULT":
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
        running.value = false; // safety: UI wieder freigeben
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
  // falls jemand direkt Start klickt ohne Konfiguration – wir lassen es zu,
  // Worker prüft und liefert saubere Fehlermeldungen
  pushLog("Start");
  worker!.postMessage({ type: "START" });
}

function onPause() {
  if (!props.envId) return;
  ensureWorker();
  pushLog("Pause");
  worker!.postMessage({ type: "STOP" }); // Worker interpretiert das als Anhalten
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
/* Select-Optik wie in EnvSetup */
.control {
  height: 44px;
  width: 100%;
  background: #111;
  color: #eee;
  border: 1px solid #333;
  border-radius: 10px;
  padding: 0 12px;
}

/* Eine Gruppe mit 4 gleich breiten Buttons  */
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
