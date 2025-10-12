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

        <!-- Greedy (OHNE Varianten) -->
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
                  class="input input--xs"
                  type="number"
                  v-model.number="localPolicies.greedy.optimisticInitialValue"
                  @change="emitPolicies"
                  @blur="emitPolicies"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- ε-Greedy (mit Varianten) -->
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
                  class="input input--xs"
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
                  class="input input--xs"
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
              <button class="btn btn-pill" type="button" @click="addEpsVariant">
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
                :key="`eps-${i}`"
                role="row"
                :class="{ 'is-alt': i % 2 === 1 }"
              >
                <div class="cell" role="cell">ε-Greedy v{{ i + 1 }}</div>
                <div class="cell" role="cell">
                  <input
                    class="input input--xs"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    v-model.number="v.epsilon"
                    @change="emitPolicies"
                    @blur="emitPolicies"
                  />
                </div>
                <div class="cell" role="cell">
                  <input
                    class="input input--xs"
                    type="number"
                    v-model.number="v.optimisticInitialValue"
                    @change="emitPolicies"
                    @blur="emitPolicies"
                  />
                </div>
                <div class="cell cell--end" role="cell">
                  <button
                    class="btn btn-ghost btn-pill btn-sm"
                    type="button"
                    @click="removeEpsVariant(i)"
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

        <!-- UCB (mit Varianten) -->
        <div class="algo-card">
          <div class="algo-head">
            <div class="pill pill-ucb">UCB</div>
          </div>
          <div class="algo-grid">
            <div class="row">
              <label class="lab" for="ucb-c">c (Konfidenz)</label>
              <div class="ctrl">
                <input
                  id="ucb-c"
                  class="input input--xs"
                  type="number"
                  step="0.1"
                  min="0"
                  v-model.number="localPolicies.ucb.confidence"
                  @change="emitPolicies"
                  @blur="emitPolicies"
                />
              </div>
            </div>
            <div class="row">
              <label class="lab" for="ucb-oiv"
                >Optimistic&nbsp;Initial&nbsp;Value</label
              >
              <div class="ctrl">
                <input
                  id="ucb-oiv"
                  class="input input--xs"
                  type="number"
                  v-model.number="localPolicies.ucb.optimisticInitialValue"
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
              <button class="btn btn-pill" type="button" @click="addUcbVariant">
                + Variante
              </button>
            </div>

            <div class="variants-table" role="table" aria-label="UCB Varianten">
              <div class="variants-row variants-row--head" role="row">
                <div class="cell" role="columnheader">Bezeichnung</div>
                <div class="cell" role="columnheader">c</div>
                <div class="cell" role="columnheader">OIV</div>
                <div class="cell cell--end" role="columnheader"></div>
              </div>

              <div
                class="variants-row"
                v-for="(v, i) in localPolicies.ucb.variants"
                :key="`ucb-${i}`"
                role="row"
                :class="{ 'is-alt': i % 2 === 1 }"
              >
                <div class="cell" role="cell">UCB v{{ i + 1 }}</div>
                <div class="cell" role="cell">
                  <input
                    class="input input--xs"
                    type="number"
                    step="0.1"
                    min="0"
                    v-model.number="v.confidence"
                    @change="emitPolicies"
                    @blur="emitPolicies"
                  />
                </div>
                <div class="cell" role="cell">
                  <input
                    class="input input--xs"
                    type="number"
                    v-model.number="v.optimisticInitialValue"
                    @change="emitPolicies"
                    @blur="emitPolicies"
                  />
                </div>
                <div class="cell cell--end" role="cell">
                  <button
                    class="btn btn-ghost btn-pill btn-sm"
                    type="button"
                    @click="removeUcbVariant(i)"
                  >
                    Entfernen
                  </button>
                </div>
              </div>

              <div
                v-if="!localPolicies.ucb.variants.length"
                class="variants-empty"
              >
                Keine Varianten angelegt.
              </div>
            </div>
          </div>
        </div>

        <!-- Thompson Sampling (nur Gaussian; mit Varianten) -->
        <div class="algo-card">
          <div class="algo-head">
            <div class="pill pill-thompson">Thompson Sampling</div>
          </div>
          <div class="algo-grid">
            <template v-if="localEnv.type === 'gaussian'">
              <div class="row">
                <label class="lab" for="ts-pv">Prior-Varianz</label>
                <div class="ctrl">
                  <input
                    id="ts-pv"
                    class="input input--xs"
                    type="number"
                    step="0.1"
                    min="0.1"
                    v-model.number="localPolicies.thompson.priorVariance"
                    @change="emitPolicies"
                    @blur="emitPolicies"
                  />
                </div>
              </div>
            </template>
            <template v-else>
              <div class="row">
                <label class="lab">Prior</label>
                <div class="ctrl">
                  <span class="muted"
                    >Bernoulli: Beta(1,1) als Standard-Prior.</span
                  >
                </div>
              </div>
            </template>
          </div>

          <!-- Varianten nur im Gaussian-Fall -->
          <div class="variants" v-if="localEnv.type === 'gaussian'">
            <div class="variants-head">
              <div class="title">Varianten</div>
              <button
                class="btn btn-pill"
                type="button"
                @click="addThompsonVariant"
              >
                + Variante
              </button>
            </div>

            <div
              class="variants-table"
              role="table"
              aria-label="Thompson Varianten"
            >
              <div class="variants-row variants-row--head" role="row">
                <div class="cell" role="columnheader">Bezeichnung</div>
                <div class="cell" role="columnheader">Prior-Varianz</div>
                <div class="cell cell--end" role="columnheader"></div>
              </div>

              <div
                class="variants-row"
                v-for="(v, i) in localPolicies.thompson.variants"
                :key="`ts-${i}`"
                role="row"
                :class="{ 'is-alt': i % 2 === 1 }"
              >
                <div class="cell" role="cell">Thompson v{{ i + 1 }}</div>
                <div class="cell" role="cell">
                  <input
                    class="input input--xs"
                    type="number"
                    step="0.1"
                    min="0.1"
                    v-model.number="v.priorVariance"
                    @change="emitPolicies"
                    @blur="emitPolicies"
                  />
                </div>
                <div class="cell cell--end" role="cell">
                  <button
                    class="btn btn-ghost btn-pill btn-sm"
                    type="button"
                    @click="removeThompsonVariant(i)"
                  >
                    Entfernen
                  </button>
                </div>
              </div>

              <div
                v-if="!localPolicies.thompson.variants.length"
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
            <AlgorithmEditor
              @policyLoaded="onCustomPolicyLoaded"
              @policyRemoved="onCustomPolicyRemoved"
            />
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
import type { iBanditPolicy } from "../algorithms/Domain/iBanditPolicy";
import type { CustomPolicyRegistration } from "../algorithms/Domain/iCustomPolicyRegistration";
import { algorithmsRunner } from "../services/algorithmsRunner";

type Mode = "manual" | "algo";
interface Props {
  mode: Mode;
  env: any;
  policyConfigs: any;
  open?: boolean;
}
const props = withDefaults(defineProps<Props>(), { open: false });

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

const localPolicies = reactive<{
  greedy: { optimisticInitialValue: number };
  epsgreedy: {
    epsilon: number;
    optimisticInitialValue: number;
    variants: Array<{ epsilon: number; optimisticInitialValue: number }>;
  };
  ucb: {
    confidence: number;
    optimisticInitialValue: number;
    variants: Array<{ confidence: number; optimisticInitialValue: number }>;
  };
  thompson: {
    priorVariance?: number;
    variants: Array<{ priorVariance: number }>;
  };
  customPolicies: CustomPolicyRegistration[];
}>({
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
  ucb: {
    confidence: props.policyConfigs?.ucb?.confidence ?? 1.0,
    optimisticInitialValue:
      props.policyConfigs?.ucb?.optimisticInitialValue ??
      (localEnv.type === "bernoulli" ? 0.6 : 120),
    variants: Array.isArray(props.policyConfigs?.ucb?.variants)
      ? [...props.policyConfigs.ucb.variants]
      : [],
  },
  thompson: {
    priorVariance: props.policyConfigs?.thompson?.priorVariance ?? 1,
    variants: Array.isArray(props.policyConfigs?.thompson?.variants)
      ? [...props.policyConfigs.thompson.variants]
      : [],
  },
  customPolicies: Array.isArray(props.policyConfigs?.customPolicies)
    ? [...props.policyConfigs.customPolicies]
    : [],
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

    localPolicies.ucb.confidence =
      p.ucb?.confidence ?? localPolicies.ucb.confidence;
    localPolicies.ucb.optimisticInitialValue =
      p.ucb?.optimisticInitialValue ?? localPolicies.ucb.optimisticInitialValue;
    localPolicies.ucb.variants = Array.isArray(p.ucb?.variants)
      ? [...p.ucb.variants]
      : [];

    localPolicies.thompson.priorVariance =
      p.thompson?.priorVariance ?? localPolicies.thompson.priorVariance;
    localPolicies.thompson.variants = Array.isArray(p.thompson?.variants)
      ? [...p.thompson.variants]
      : [];

    localPolicies.customPolicies = Array.isArray(p.customPolicies)
      ? [...p.customPolicies]
      : [];
  },
  { deep: true, immediate: true },
);

watch(
  () => props.open,
  (v) => (openLocal.value = !!v),
  { immediate: true },
);

/* Runner-Reconfig für sofortige Sichtbarkeit (Chart/Tabelle) */
function reconfigureRunner(policyOut: any) {
  try {
    algorithmsRunner.configure({
      envConfig: { ...props.env, ...localEnv },
      totalSteps: 0,
      rate: 1,
      policyConfigs: policyOut,
    });
  } catch {
    /* noop */
  }
}

/* Emits */
function emitEnv() {
  const envOut = { ...props.env, ...localEnv };
  emit("update:env", envOut);
  reconfigureRunner({
    ...props.policyConfigs,
    ...localPolicies,
  });
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
    ucb: {
      confidence: localPolicies.ucb.confidence,
      optimisticInitialValue: localPolicies.ucb.optimisticInitialValue,
      variants: [...localPolicies.ucb.variants],
    },
    thompson: {
      priorVariance:
        localEnv.type === "gaussian"
          ? localPolicies.thompson.priorVariance
          : undefined,
      variants:
        localEnv.type === "gaussian"
          ? [...localPolicies.thompson.variants]
          : [],
    },
    /* WICHTIG: KEIN gradient mehr – keine alpha-Felder, keine Varianten */
    customPolicies: [...localPolicies.customPolicies],
  };
  emit("update:policyConfigs", out);
  reconfigureRunner(out); // sofortiger Refresh
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

/* Varianten-Handler – nur für parameterisierte Algos */
function addEpsVariant() {
  localPolicies.epsgreedy.variants.push({
    epsilon: 0.1,
    optimisticInitialValue: localEnv.type === "bernoulli" ? 0.6 : 150,
  });
  emitPolicies();
  nextTick();
}
function removeEpsVariant(i: number) {
  localPolicies.epsgreedy.variants.splice(i, 1);
  emitPolicies();
}

function addUcbVariant() {
  localPolicies.ucb.variants.push({
    confidence: 1.0,
    optimisticInitialValue: localEnv.type === "bernoulli" ? 0.6 : 120,
  });
  emitPolicies();
  nextTick();
}
function removeUcbVariant(i: number) {
  localPolicies.ucb.variants.splice(i, 1);
  emitPolicies();
}

function addThompsonVariant() {
  if (localEnv.type !== "gaussian") return;
  localPolicies.thompson.variants.push({ priorVariance: 1 });
  emitPolicies();
  nextTick();
}
function removeThompsonVariant(i: number) {
  localPolicies.thompson.variants.splice(i, 1);
  emitPolicies();
}

/* Eigene Algos */
function slugifyName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function ensureCustomId(name: string) {
  const base = slugifyName(name);
  if (!base) return `custom:${Date.now().toString(36)}`;
  return `custom:${base}`;
}
function onCustomPolicyLoaded(payload: {
  name: string;
  policyCtor: new () => iBanditPolicy;
}) {
  if (!payload?.policyCtor) return;
  const idCandidate = ensureCustomId(payload.name);
  const idx = localPolicies.customPolicies.findIndex(
    (entry) => entry.name === payload.name || entry.id === idCandidate,
  );
  const registration: CustomPolicyRegistration = {
    id: idx >= 0 ? localPolicies.customPolicies[idx].id : idCandidate,
    name: payload.name,
    factory: () => new payload.policyCtor(),
  };
  if (idx >= 0) localPolicies.customPolicies.splice(idx, 1, registration);
  else localPolicies.customPolicies.push(registration);
  customOpen.value = true;
  emitPolicies();
}
function onCustomPolicyRemoved(payload: { name: string }) {
  const i = localPolicies.customPolicies.findIndex(
    (entry) => entry.name === payload?.name,
  );
  if (i >= 0) {
    localPolicies.customPolicies.splice(i, 1);
    emitPolicies();
  }
}
function onCustomToggle(e: Event) {
  const el = e.target as HTMLDetailsElement;
  customOpen.value = !!el?.open;
}
</script>

<style scoped>
/* Farb-/Kontrast-Token */
.adv {
  --bg-14: #141414;
  --bg-15: #151515;
  --bg-16: #161616;
  --bg-17: #171717;
  --bg-18: #181818;
  --bg-1a: #1a1a1a;
  --br-22: #222;
  --br-26: #262626;

  padding: 0;
  background: var(--bg-14);
  border-color: var(--br-22);
  border-radius: 12px;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 14px;
  border: none;
  background: var(--bg-17);
  border-bottom: 1px solid var(--br-22);
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
  background: var(--bg-14);
}

.group {
  border: 1px solid var(--br-22);
  border-radius: 12px;
  padding: 10px;
  margin-bottom: 12px;
  background: var(--bg-15);
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
  border: 1px solid var(--br-22);
  color: #e8e8e8;
}

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
  border: 1px solid var(--br-22);
  border-radius: 10px;
  background: var(--bg-16);
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

.input {
  width: 100%;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--br-22);
  border-radius: 9px;
  background: #121212;
  color: #f1f1f1;
}
.input--xs {
  height: 30px;
  max-width: 120px;
  padding: 0 8px;
}

.btn {
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--br-22);
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

.algo-card {
  border: 1px solid var(--br-22);
  border-radius: 12px;
  padding: 10px;
  background: var(--bg-18);
  margin-top: 10px;
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
.pill-ucb {
  border-color: #1aa091;
  color: #c9fffa;
}
.pill-thompson {
  border-color: #607d8b;
  color: #d9e4ea;
}

.algo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

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
  border: 1px solid var(--br-22);
  border-radius: 10px;
}
.variants-table {
  border: 1px solid var(--br-22);
  border-radius: 10px;
  overflow: hidden;
  background: #131313;
}
.variants-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 0.6fr;
  gap: 0;
  border-top: 1px solid var(--br-22);
  background: #151515;
}
.variants-row.is-alt {
  background: #131313;
}
.variants-row:first-child {
  border-top: none;
}
.variants-row--head {
  background: var(--bg-1a);
  font-weight: 600;
}
.cell {
  padding: 10px;
  border-right: 1px solid var(--br-22);
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
  color: #aeb4bd;
}

.custom {
  margin-top: 10px;
  background: var(--bg-15);
  border-radius: 12px;
  border: 1px solid var(--br-22);
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
  border-top: 1px solid var(--br-22);
  background: #151515;
  border-radius: 0 0 12px 12px;
}

@media (max-width: 980px) {
  .grid,
  .algo-grid {
    grid-template-columns: 1fr;
  }
}
</style>
