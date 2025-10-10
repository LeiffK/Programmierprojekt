<template>
  <section class="card adv" aria-label="Erweiterte Einstellungen">
    <!-- Header / Aufklappbar -->
    <button
      class="head"
      @click="toggleOpen"
      :aria-expanded="openLocal ? 'true' : 'false'"
    >
      <div class="head-left">
        <span class="badge">Erweiterte Einstellungen</span>
      </div>
      <div class="head-right">
        <span class="chev" :class="{ open: openLocal }">▾</span>
      </div>
    </button>

    <div v-show="openLocal" class="body">
      <!-- Umgebung -->
      <div class="group" aria-labelledby="env-title">
        <div id="env-title" class="group-head">
          <span class="chip chip-neutral">Umgebung</span>
        </div>
        <div class="grid">
          <div class="row">
            <label class="lab" for="seed">Seed</label>
            <div class="ctrl seed-line">
              <input
                id="seed"
                class="input"
                type="number"
                v-model.number="localEnv.seed"
                :min="0"
                @change="emitEnv"
                @blur="emitEnv"
              />
              <button class="btn btn-pill" type="button" @click="rollSeed">
                Würfeln
              </button>
            </div>
          </div>

          <div class="row">
            <label class="lab" for="arms">Arme</label>
            <div class="ctrl">
              <input
                id="arms"
                class="input"
                type="number"
                min="1"
                v-model.number="localEnv.arms"
                @change="emitEnv"
                @blur="emitEnv"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Algorithmen -->
      <div class="group" aria-labelledby="algo-title">
        <div id="algo-title" class="group-head">
          <span class="chip chip-neutral">Algorithmen</span>
        </div>

        <!-- Greedy -->
        <div class="algo-card">
          <div class="algo-head">
            <div class="pill pill-greedy">Greedy</div>
          </div>
          <div class="algo-grid">
            <div class="row">
              <label class="lab" for="greedy-oiv"
                >Optimistic&nbsp;Initial&nbsp;Value</label
              >
              <div class="ctrl">
                <input
                  id="greedy-oiv"
                  class="input"
                  type="number"
                  v-model.number="localPolicies.greedy.optimisticInitialValue"
                  @change="emitPolicies"
                  @blur="emitPolicies"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- ε-Greedy -->
        <div class="algo-card">
          <div class="algo-head">
            <div class="pill pill-eps">ε-Greedy</div>
          </div>

          <div class="algo-grid">
            <div class="row">
              <label class="lab" for="eps-eps">ε (Basis)</label>
              <div class="ctrl">
                <input
                  id="eps-eps"
                  class="input"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  v-model.number="localPolicies.epsgreedy.epsilon"
                  @change="emitPolicies"
                  @blur="emitPolicies"
                />
              </div>
            </div>

            <div class="row">
              <label class="lab" for="eps-oiv"
                >Optimistic&nbsp;Initial&nbsp;Value</label
              >
              <div class="ctrl">
                <input
                  id="eps-oiv"
                  class="input"
                  type="number"
                  v-model.number="
                    localPolicies.epsgreedy.optimisticInitialValue
                  "
                  @change="emitPolicies"
                  @blur="emitPolicies"
                />
              </div>
            </div>
          </div>

          <!-- Varianten -->
          <div class="variants">
            <div class="variants-head">
              <div class="title">Varianten</div>
              <button class="btn btn-pill" type="button" @click="addVariant">
                + Variante
              </button>
            </div>

            <div
              class="variants-table"
              role="table"
              aria-label="ε-Greedy Varianten"
            >
              <div class="variants-row variants-row--head" role="row">
                <div class="cell" role="columnheader">Bezeichnung</div>
                <div class="cell" role="columnheader">ε</div>
                <div class="cell" role="columnheader">OIV</div>
                <div class="cell cell--end" role="columnheader"></div>
              </div>

              <div
                class="variants-row"
                v-for="(v, i) in localPolicies.epsgreedy.variants"
                :key="`v-${i}`"
                role="row"
                :class="{ 'is-alt': i % 2 === 1 }"
              >
                <div class="cell" role="cell">ε-Greedy v{{ i + 1 }}</div>
                <div class="cell" role="cell">
                  <input
                    class="input input--sm"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    v-model.number="v.epsilon"
                    @change="emitPolicies"
                    @blur="emitPolicies"
                    :aria-label="`ε für Variante ${i + 1}`"
                  />
                </div>
                <div class="cell" role="cell">
                  <input
                    class="input input--sm"
                    type="number"
                    v-model.number="v.optimisticInitialValue"
                    @change="emitPolicies"
                    @blur="emitPolicies"
                    :aria-label="`OIV für Variante ${i + 1}`"
                  />
                </div>
                <div class="cell cell--end" role="cell">
                  <button
                    class="btn btn-ghost btn-pill btn-sm"
                    type="button"
                    @click="removeVariant(i)"
                    :aria-label="`Variante ${i + 1} entfernen`"
                  >
                    Entfernen
                  </button>
                </div>
              </div>

              <div
                v-if="!localPolicies.epsgreedy.variants.length"
                class="variants-empty"
              >
                Keine Varianten angelegt.
              </div>
            </div>
          </div>
        </div>
          <!-- Eigener Algorithmus -->
          <details class="custom" :open="customOpen" @toggle="onCustomToggle">
            <summary>Eigener Algorithmus</summary>
            <div class="custom-body">
              <AlgorithmEditor @policyLoaded="onCustomPolicyLoaded" />
            </div>
          </details>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  reactive,
  ref,
  watch,
  withDefaults,
  defineProps,
  defineEmits,
  nextTick,
} from "vue";
import AlgorithmEditor from "./AlgorithmEditor.vue";


type Mode = "manual" | "algo";

interface Props {
  mode: Mode;
  env: any; // iEnvConfig – bewusst locker gehalten
  policyConfigs: any; // { greedy, epsgreedy, customPolicy? }
  open?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
});

const emit = defineEmits<{
  (e: "update:env", v: any): void;
  (e: "update:policyConfigs", v: any): void;
  (e: "update:open", v: boolean): void;
}>();

/* Lokaler Shadow-State */
const localEnv = reactive<any>({
  type: props.env?.type ?? "gaussian",
  arms: props.env?.arms ?? 6,
  seed: props.env?.seed ?? 12345,
});

const localPolicies = reactive<any>({
  greedy: {
    optimisticInitialValue:
      props.policyConfigs?.greedy?.optimisticInitialValue ?? 100,
  },
  epsgreedy: {
    epsilon: props.policyConfigs?.epsgreedy?.epsilon ?? 0.1,
    optimisticInitialValue:
      props.policyConfigs?.epsgreedy?.optimisticInitialValue ?? 150,
    variants: Array.isArray(props.policyConfigs?.epsgreedy?.variants)
      ? [...props.policyConfigs.epsgreedy.variants]
      : [],
  },
  customPolicy: props.policyConfigs?.customPolicy ?? null,
});

const openLocal = ref<boolean>(props.open);
const customOpen = ref<boolean>(false);

/* Sync außen → innen */
watch(
  () => props.env,
  (v) => {
    if (!v) return;
    localEnv.type = v.type ?? localEnv.type;
    localEnv.arms = v.arms ?? localEnv.arms;
    localEnv.seed = v.seed ?? localEnv.seed;
  },
  { deep: true, immediate: true },
);

watch(
  () => props.policyConfigs,
  (p) => {
    if (!p) return;
    localPolicies.greedy.optimisticInitialValue =
      p.greedy?.optimisticInitialValue ??
      localPolicies.greedy.optimisticInitialValue;

    localPolicies.epsgreedy.epsilon =
      p.epsgreedy?.epsilon ?? localPolicies.epsgreedy.epsilon;
    localPolicies.epsgreedy.optimisticInitialValue =
      p.epsgreedy?.optimisticInitialValue ??
      localPolicies.epsgreedy.optimisticInitialValue;
    localPolicies.epsgreedy.variants = Array.isArray(p.epsgreedy?.variants)
      ? [...p.epsgreedy.variants]
      : [];
    localPolicies.customPolicy = p.customPolicy ?? null;
  },
  { deep: true, immediate: true },
);

watch(
  () => props.open,
  (v) => (openLocal.value = !!v),
  { immediate: true },
);

/* Emits */
function emitEnv() {
  emit("update:env", { ...props.env, ...localEnv });
}
function emitPolicies() {
  const out = {
    ...props.policyConfigs,
    greedy: {
      optimisticInitialValue: localPolicies.greedy.optimisticInitialValue,
    },
    epsgreedy: {
      epsilon: localPolicies.epsgreedy.epsilon,
      optimisticInitialValue: localPolicies.epsgreedy.optimisticInitialValue,
      variants: [...localPolicies.epsgreedy.variants],
    },
    customPolicy: localPolicies.customPolicy ?? null,
  };
  emit("update:policyConfigs", out);
}

/* UI-Interaktionen */
function toggleOpen() {
  openLocal.value = !openLocal.value;
  emit("update:open", openLocal.value);
}
function rollSeed() {
  localEnv.seed = Math.floor(Math.random() * 1_000_000);
  emitEnv();
}
function addVariant() {
  localPolicies.epsgreedy.variants.push({
    epsilon: 0.1,
    optimisticInitialValue: 150,
  });
  emitPolicies();
  nextTick(); // sorgt dafür, dass neue Zeile direkt sichtbar wird
}
function removeVariant(i: number) {
  localPolicies.epsgreedy.variants.splice(i, 1);
  emitPolicies();
}
function onCustomToggle(e: Event) {
  const el = e.target as HTMLDetailsElement;
  customOpen.value = !!el?.open;
}
</script>

<style scoped>
/* Farb- & Kontrast-Token – abgestufte Grautöne */
.adv {
  --bg-00: #0e0e0e;
  --bg-10: #111111;
  --bg-12: #131313;
  --bg-14: #141414;
  --bg-15: #151515;
  --bg-16: #161616;
  --bg-17: #171717;
  --bg-18: #181818;
  --bg-19: #191919;
  --bg-1a: #1a1a1a;
  --br-22: #222222;
  --br-26: #262626;
  --br-2a: #2a2a2a;

  --panel: var(--bg-14);
  --panel-1: var(--bg-15);
  --panel-2: var(--bg-18);
  --header: var(--bg-17);
  --row: var(--bg-16);
  --row-alt: var(--bg-14);
  --row-head: var(--bg-1a);
  --border: var(--br-22);
  --border-hr: var(--br-26);
  --muted: #aeb4bd;

  padding: 0;
  background: var(--panel);
  border-color: var(--border);
  border-radius: 12px;
}

/* Header oben (Aufklappbar) */
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 14px;
  border: none;
  background: var(--header);
  border-bottom: 1px solid var(--border);
  border-radius: 12px 12px 0 0;
  color: #eaeaea;
  cursor: pointer;
}
.head:hover {
  background: #1b1b1b;
}
.head-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.badge {
  font-weight: 600;
}
.head-right .chev {
  transition: transform 0.18s ease;
}
.head-right .chev.open {
  transform: rotate(180deg);
}
.body {
  padding: 12px;
  background: var(--panel);
}

/* Box-Gruppen */
.group {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px;
  margin-bottom: 12px;
  background: var(--panel-1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}
.group-head {
  margin: 2px 0 10px 0;
}
.chip {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: var(--bg-18);
  border: 1px solid var(--border);
  color: #e8e8e8;
}

/* Grid/Rows */
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.row {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--row);
}
.row + .row {
  margin-top: 6px;
}
.lab {
  width: 180px;
  opacity: 0.95;
}
.ctrl {
  flex: 1;
  display: flex;
  gap: 8px;
  align-items: center;
}
.seed-line {
  display: flex;
  gap: 8px;
}

/* Inputs */
.input {
  width: 100%;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: #121212;
  color: #f1f1f1;
  box-shadow: inset 0 1px 0 rgba(0, 0, 0, 0.3);
}
.input--sm {
  height: 30px;
}
.input:focus {
  outline: none;
  border-color: var(--br-2a);
  box-shadow: 0 0 0 2px rgba(120, 160, 255, 0.15);
}

/* Buttons */
.btn {
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--border);
  background: #191b1f;
  color: #eaeaea;
  border-radius: 10px;
  cursor: pointer;
}
.btn:hover {
  background: #1e2126;
}
.btn-pill {
  border-radius: 999px;
}
.btn-ghost {
  background: #161616;
}
.btn-sm {
  height: 28px;
  padding: 0 10px;
}

/* Algo-Karten (leichter Kontrast + Kante) */
.algo-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px;
  background: var(--panel-2);
  margin-top: 10px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
}
.algo-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.pill {
  display: inline-block;
  background: #1a1a1a;
  border: 1px solid #262626;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
}
.pill-greedy {
  border-color: #3aa9d6;
  color: #cdefff;
}
.pill-eps {
  border-color: #d68a2a;
  color: #fde3bf;
}
.algo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

/* Varianten – bessere Absetzung & Zebra */
.variants {
  margin-top: 10px;
}
.variants-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 8px 10px;
  background: var(--bg-18);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.variants-table {
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--row-alt);
}
.variants-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 0.6fr;
  gap: 0;
  border-top: 1px solid var(--border);
  background: #151515;
}
.variants-row.is-alt {
  background: #131313;
}
.variants-row:first-child {
  border-top: none;
}
.variants-row--head {
  background: var(--row-head);
  font-weight: 600;
}
.cell {
  padding: 10px;
  border-right: 1px solid var(--border);
}
.cell:last-child {
  border-right: none;
}
.cell--end {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.variants-empty {
  padding: 12px;
  color: var(--muted);
}

/* Custom-Editor */
.custom {
  margin-top: 10px;
  background: var(--panel-1);
  border-radius: 12px;
  border: 1px solid var(--border);
}
.custom summary {
  cursor: pointer;
  padding: 10px;
}
.custom summary:hover {
  background: #1b1b1b;
}
.custom-body {
  padding: 10px;
  border-top: 1px solid var(--border);
  background: #151515;
  border-radius: 0 0 12px 12px;
}
.muted {
  color: var(--muted);
}

/* Responsive */
@media (max-width: 980px) {
  .grid,
  .algo-grid {
    grid-template-columns: 1fr;
  }
}
</style>
