<template>
  <section class="card">
    <div class="card-head">
      <h2>Environment</h2>
      <div class="head-actions">
        <!-- App kann hier beliebige Controls einschieben -->
        <slot name="actions" />
      </div>
    </div>

    <div class="form-grid">
      <div class="field col-4">
        <label class="label">Typ</label>
        <select v-model="local.type" class="control">
          <option value="gaussian">Gaussian · Watchtime</option>
          <option value="bernoulli" disabled>Bernoulli · CTR (bald)</option>
          <!-- schonmal bernoulli einbauen,
                                                                                  damit das später einfach direkt
                                                                                  "aktiviert" werden kann -->
        </select>
      </div>

      <!-- # Thumbnails mit mindestanzahl 2 und maximal 12   -->
      <div class="col-4">
        <NumericStepper
          v-model="local.arms"
          label="# Thumbnails"
          :min="2"
          :max="12"
          :step="1"
          @bump="
            (p) =>
              emit(
                'log',
                `Thumbnails ${p.delta > 0 ? 'erhöht' : 'verringert'} → ${p.value}`,
              )
          "
        />
      </div>

      <!-- Eingabefeld für den Seed -->
      <div class="field col-4">
        <label class="label">Seed</label>
        <input
          v-model.number="local.seed"
          type="number"
          min="0"
          class="control no-spin"
          inputmode="numeric"
        />
      </div>
    </div>

    <div class="actions">
      <div class="control-group group-3">
        <!-- 1) Seed würfeln -->
        <button
          class="group-btn"
          type="button"
          :disabled="busy"
          @click="onSeedRoll"
          title="Seed zufällig setzen"
        >
          🎲 Seed würfeln
        </button>

        <!-- 2) μ/σ zufällig  -->
        <button
          class="group-btn"
          type="button"
          :disabled="busy"
          @click="randomize"
          title="Mittelwert/Std-Abw. zufällig setzen"
        >
          μ/σ zufällig
        </button>

        <!-- 3) initialisieren -->
        <button
          class="group-btn primary"
          type="button"
          :disabled="busy"
          @click="init"
          title="Environment initialisieren"
        >
          Initialisieren
        </button>
      </div>

      <span class="muted" v-if="envId"
        >Env: <code>{{ envIdShort }}</code></span
      >
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import type { iEnvConfig } from "../env/domain/iEnvConfig.js";
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
  seed: props.modelValue.seed ?? 12345,
  means: props.modelValue.means,
  stdDev: props.modelValue.stdDev,
});

watch(
  () => props.modelValue,
  (v) => Object.assign(local, v),
  { deep: true },
);
watch(
  local,
  (v) => {
    if (v.type !== "gaussian") v.type = "gaussian"; // bernoulli noch deaktiviert
    emit("update:modelValue", { ...v });
  },
  { deep: true },
);

const envId = computed(() => (local as any)._envId as string | undefined);
const envIdShort = computed(() =>
  envId.value ? envId.value.split("-")[0] : "—",
);

// Helper: μ/σ random erzwingen
function randomize() {
  local.means = undefined;
  local.stdDev = undefined;
  emit("log", "μ/σ zurückgesetzt – werden beim Init zufällig erzeugt.");
}

// seed würfeln
function onSeedRoll() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  // bisschen begrenzen, sonst unnötig lang: 5-stellig wirkt freundlicher
  const next = Number(String(buf[0]).slice(0, 5));
  local.seed = next;
  emit("log", `Seed gewürfelt → ${next}`);
}

async function init() {
  const res = await initEnv({ ...local, type: "gaussian" });
  (local as any)._envId = res.envId;
  emit("inited", res);
  emit("log", JSON.stringify({ optimalAction: res.optimalAction }, null, 2));
}
</script>

<style scoped>
/* Grid  */
.form-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 12px;
  align-items: end;
}
.field {
  display: flex;
  flex-direction: column;
}
.col-4 {
  grid-column: span 4;
}
@media (max-width: 980px) {
  .col-4 {
    grid-column: 1 / -1;
  }
}

/* Inputs */
.control {
  height: 44px;
  width: 100%;
  background: #111;
  color: #eee;
  border: 1px solid #333;
  border-radius: 10px;
  padding: 0 12px;
}

/* Stepper/Control-Gruppe  */
.control-group {
  height: 44px;
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto;
  background: #111;
  border: 1px solid #333;
  border-radius: 10px;
  overflow: hidden;
}
.group-3 {
  grid-template-columns: 1fr 1fr 1fr;
} /* die drei Buttons nebeneinander */

.group-input {
  height: 42px;
  width: 100%;
  margin: 0;
  padding: 0 12px;
  background: transparent;
  color: #eee;
  border: 0;
  outline: none;
  text-align: center;
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
}
.group-btn:last-child {
  border-right: 0;
}
.group-btn.primary {
  background: #ff0000;
  border-right: 1px solid #ff0000;
}
.group-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.control {
  height: 44px;
  width: 100%;
  background: #111;
  color: #eee;
  border: 1px solid #333;
  border-radius: 10px;
  padding: 0 12px;
  box-sizing: border-box;
}

.no-spin::-webkit-outer-spin-button,
.no-spin::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.no-spin {
  -moz-appearance: textfield;
  appearance: textfield;
}

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
</style>
