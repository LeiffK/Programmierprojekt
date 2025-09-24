<template>
  <section class="card">
    <h2>Environment</h2>

    <!-- 3 Spalten, identische Control-Höhe/Breite -->
    <div class="form-grid">
      <!-- Typ -->
      <div class="field col-4">
        <label class="label">Typ</label>
        <select v-model="local.type" class="control">
          <option value="gaussian">Gaussian · Watchtime</option>
          <option value="bernoulli" disabled>Bernoulli · CTR (bald)</option>
        </select>
      </div>

      <!-- # Thumbnails -->
      <div class="field col-4">
        <label class="label"># Thumbnails</label>
        <div class="control-group">
          <button
            class="group-btn"
            type="button"
            title="−1"
            @click="local.arms = Math.max(2, local.arms - 1)"
          >
            −
          </button>

          <input
            v-model.number="local.arms"
            type="number"
            min="2"
            max="12"
            class="group-input"
          />

          <button
            class="group-btn"
            type="button"
            title="+1"
            @click="local.arms = Math.min(12, local.arms + 1)"
          >
            +
          </button>
        </div>
      </div>

      <!-- Seed -->
      <div class="field col-4">
        <label class="label">Seed</label>
        <input
          v-model.number="local.seed"
          type="number"
          min="0"
          class="control"
        />
      </div>
    </div>

    <div class="row">
      <button class="btn" @click="randomize" :disabled="busy">
        Zufalls-Parameter (μ/σ)
      </button>
      <button class="btn primary" @click="init" :disabled="busy">
        Environment initialisieren
      </button>
      <div class="muted" v-if="envId">
        Env: <code>{{ envIdShort }}</code>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import type { iEnvConfig } from "../env/Domain/iEnvConfig.js";
import { initEnv } from "../api/banditClient";

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
    if (v.type !== "gaussian") v.type = "gaussian"; // Bernoulli ist noch deaktiviert
    emit("update:modelValue", { ...v });
  },
  { deep: true },
);

const envId = computed(() => (local as any)._envId as string | undefined);
const envIdShort = computed(() =>
  envId.value ? envId.value.split("-")[0] : "—",
);

function randomize() {
  local.means = undefined;
  local.stdDev = undefined;
  emit("log", "Params cleared. Env will generate μ and σ on init.");
}

async function init() {
  const res = await initEnv({ ...local, type: "gaussian" });
  (local as any)._envId = res.envId;
  emit("inited", res);
  emit("log", JSON.stringify({ optimalAction: res.optimalAction }, null, 2));
}
</script>

<style scoped>
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

/* Einheitliche Control-Größe */
.control,
.control-group {
  height: 44px;
  width: 100%;
  background: #111;
  color: #eee;
  border: 1px solid #333;
  border-radius: 10px;
  box-sizing: border-box;
}

/* Select & Input optisch angleichen */
.control {
  padding: 0 12px;
  appearance: none;
}

/* Stepper-Gruppe als ein Control */
.control-group {
  display: grid;
  grid-template-columns: auto 1fr auto;
  overflow: hidden; /* eine saubere Kontur */
}
.group-btn {
  width: 44px;
  height: 42px; /* -2px wirkt optisch mittig innerhalb der Border */
  margin: 0;
  padding: 0;
  background: #1a1a1a;
  color: #fff;
  border: 0;
  border-right: 1px solid #333;
  cursor: pointer;
}
.group-btn:last-child {
  border-right: 0;
  border-left: 1px solid #333;
}
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

.label {
  margin-bottom: 6px;
}
</style>
