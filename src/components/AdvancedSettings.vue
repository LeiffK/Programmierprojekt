<template>
  <section class="card adv" aria-label="Erweiterte Einstellungen">
    <!-- Header / Aufklappbar -->
    <header
      class="accordion-head"
      role="button"
      tabindex="0"
      @click="toggleOpen"
      @keydown.enter.prevent="toggleOpen"
      @keydown.space.prevent="toggleOpen"
    >
      <h2>Erweiterte Einstellungen <InfoTooltip text="Hier kannst du alles feintunen: Den Seed festlegen (gleicher Seed = gleiche Ergebnisse), die Anzahl der Test-Varianten ändern und jeden Algorithmus mit eigenen Parametern konfigurieren. Erstelle mehrere Varianten eines Algorithmus mit verschiedenen Werten, um zu sehen, welche Einstellung am besten performt." /></h2>
      <div class="meta">
        <button class="btn btn-ghost btn-pill" type="button">
          {{ openLocal ? "Einklappen" : "Einblenden" }}
        </button>
      </div>
    </header>

    <transition name="fade-slide">
      <div v-if="openLocal" class="table-wrap">
        <!-- Umgebung -->
        <div class="group" aria-labelledby="env-title">
          <div id="env-title" class="group-head">
            <span class="chip chip-neutral">Umgebung</span>
          </div>
        <div class="grid">
          <div class="row">
            <label class="lab" for="seed">Seed</label>
            <div class="ctrl seed-line">
              <NumericStepper
                class="seed-stepper"
                v-model="localEnv.seed"
                :min="0"
                :max="9999999999"
                :step="1"
                @update:modelValue="emitEnv"
              />
              <button class="btn btn-pill" type="button" @click="rollSeed">
                Würfeln
              </button>
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
          <button
            class="algo-toggle"
            type="button"
            @click="toggleAlgo('greedy')"
            :aria-expanded="algoOpen.greedy ? 'true' : 'false'"
          >
            <div class="algo-head">
              <div class="pill pill-greedy">Greedy</div>
            </div>
            <span class="algo-chevron" :class="{ open: algoOpen.greedy }"
              >▾</span
            >
          </button>

          <div class="algo-body" v-show="algoOpen.greedy">
            <div class="algo-grid">
              <div class="row">
                <label class="lab" for="greedy-oiv"
                  >Optimistic&nbsp;Initial&nbsp;Value</label
                >
                <div class="ctrl">
                  <NumericStepper
                    v-model="localPolicies.greedy.optimisticInitialValue"
                    :min="0"
                    :max="1000"
                    :step="1"
                    @update:modelValue="emitPolicies"
                  />
                </div>
              </div>
            </div>

            <div class="variants">
              <div class="variants-head">
                <div class="title">Varianten</div>
                <button
                  class="btn btn-pill"
                  type="button"
                  @click="addGreedyVariant"
                >
                  + Variante
                </button>
              </div>

              <div
                class="variants-table variants-table--greedy"
                role="table"
                aria-label="Greedy Varianten"
              >
                <div class="variants-row variants-row--head" role="row">
                  <div class="cell" role="columnheader">Bezeichnung</div>
                  <div class="cell" role="columnheader">OIV</div>
                  <div class="cell cell--end" role="columnheader"></div>
                </div>

                <div
                  class="variants-row variants-row--greedy"
                  v-for="(v, i) in localPolicies.greedy.variants"
                  :key="`greedy-${i}`"
                  role="row"
                  :class="{ 'is-alt': i % 2 === 1 }"
                >
                  <div class="cell" role="cell">Greedy v{{ i + 1 }}</div>
                  <div class="cell" role="cell">
                    <NumericStepper
                      v-model="v.optimisticInitialValue"
                      :min="0"
                      :max="1000"
                      :step="1"
                      @update:modelValue="emitPolicies"
                    />
                  </div>
                  <div class="cell cell--end" role="cell">
                    <button
                      class="btn btn-ghost btn-pill btn-sm"
                      type="button"
                      @click="removeGreedyVariant(i)"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>

                <div
                  v-if="!localPolicies.greedy.variants.length"
                  class="variants-empty"
                >
                  Keine Varianten angelegt.
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ε-Greedy (mit Varianten) -->
        <div class="algo-card">
          <button
            class="algo-toggle"
            type="button"
            @click="toggleAlgo('eps')"
            :aria-expanded="algoOpen.eps ? 'true' : 'false'"
          >
            <div class="algo-head">
              <div class="pill pill-eps">ε-Greedy</div>
            </div>
            <span class="algo-chevron" :class="{ open: algoOpen.eps }">▾</span>
          </button>

          <div class="algo-body" v-show="algoOpen.eps">
            <div class="algo-grid">
              <div class="row">
                <label class="lab" for="eps-eps">ε (Basis)</label>
                <div class="ctrl">
                  <NumericStepper
                    v-model="localPolicies.epsgreedy.epsilon"
                    :min="0"
                    :max="1"
                    :step="0.01"
                    @update:modelValue="emitPolicies"
                  />
                </div>
              </div>

              <div class="row">
                <label class="lab" for="eps-oiv"
                  >Optimistic&nbsp;Initial&nbsp;Value</label
                >
                <div class="ctrl">
                  <NumericStepper
                    v-model="localPolicies.epsgreedy.optimisticInitialValue"
                    :min="0"
                    :max="1000"
                    :step="1"
                    @update:modelValue="emitPolicies"
                  />
                </div>
              </div>
            </div>

            <!-- Varianten -->
            <div class="variants">
              <div class="variants-head">
                <div class="title">Varianten</div>
                <button
                  class="btn btn-pill"
                  type="button"
                  @click="addEpsVariant"
                >
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
                    <NumericStepper
                      v-model="v.epsilon"
                      :min="0"
                      :max="1"
                      :step="0.01"
                      @update:modelValue="emitPolicies"
                    />
                  </div>
                  <div class="cell" role="cell">
                    <NumericStepper
                      v-model="v.optimisticInitialValue"
                      :min="0"
                      :max="1000"
                      :step="1"
                      @update:modelValue="emitPolicies"
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
        </div>

        <!-- UCB (mit Varianten) -->
        <div class="algo-card">
          <button
            class="algo-toggle"
            type="button"
            @click="toggleAlgo('ucb')"
            :aria-expanded="algoOpen.ucb ? 'true' : 'false'"
          >
            <div class="algo-head">
              <div class="pill pill-ucb">UCB</div>
            </div>
            <span class="algo-chevron" :class="{ open: algoOpen.ucb }">▾</span>
          </button>
          <div class="algo-body" v-show="algoOpen.ucb">
            <div class="algo-grid">
              <div class="row">
                <label class="lab" for="ucb-c">c (Konfidenz)</label>
                <div class="ctrl">
                  <NumericStepper
                    v-model="localPolicies.ucb.confidence"
                    :min="0"
                    :max="10"
                    :step="0.1"
                    @update:modelValue="emitPolicies"
                  />
                </div>
              </div>
              <div class="row">
                <label class="lab" for="ucb-oiv"
                  >Optimistic&nbsp;Initial&nbsp;Value</label
                >
                <div class="ctrl">
                  <NumericStepper
                    v-model="localPolicies.ucb.optimisticInitialValue"
                    :min="0"
                    :max="1000"
                    :step="1"
                    @update:modelValue="emitPolicies"
                  />
                </div>
              </div>
            </div>

            <!-- Varianten -->
            <div class="variants">
              <div class="variants-head">
                <div class="title">Varianten</div>
                <button
                  class="btn btn-pill"
                  type="button"
                  @click="addUcbVariant"
                >
                  + Variante
                </button>
              </div>

              <div
                class="variants-table"
                role="table"
                aria-label="UCB Varianten"
              >
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
                    <NumericStepper
                      v-model="v.confidence"
                      :min="0"
                      :max="10"
                      :step="0.1"
                      @update:modelValue="emitPolicies"
                    />
                  </div>
                  <div class="cell" role="cell">
                    <NumericStepper
                      v-model="v.optimisticInitialValue"
                      :min="0"
                      :max="1000"
                      :step="1"
                      @update:modelValue="emitPolicies"
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
        </div>

        <!-- Thompson Sampling -->
        <div class="algo-card">
          <button
            class="algo-toggle"
            type="button"
            @click="toggleAlgo('thompson')"
            :aria-expanded="algoOpen.thompson ? 'true' : 'false'"
          >
            <div class="algo-head">
              <div class="pill pill-thompson">Thompson</div>
            </div>
            <span class="algo-chevron" :class="{ open: algoOpen.thompson }"
              >▾</span
            >
          </button>
          <div class="algo-body" v-show="algoOpen.thompson">
            <div class="algo-grid">
              <div class="row">
                <label class="lab" for="ts-pv">Prior-Varianz</label>
                <div class="ctrl">
                  <NumericStepper
                    v-model="localPolicies.thompson.priorVariance"
                    :min="0.1"
                    :max="100"
                    :step="0.1"
                    @update:modelValue="emitPolicies"
                  />
                </div>
              </div>
            </div>

            <!-- Varianten -->
            <div class="variants">
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
                    <NumericStepper
                      v-model="v.priorVariance"
                      :min="0.1"
                      :max="100"
                      :step="0.1"
                      @update:modelValue="emitPolicies"
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
        </div>

        <!-- Eigener Algorithmus -->
        <details class="custom" :open="customOpen" @toggle="onCustomToggle">
          <summary>
            <div class="custom-head">
              <span>Eigener Algorithmus <InfoTooltip text="Programmiere deinen eigenen Bandit-Algorithmus in TypeScript und teste ihn direkt gegen die Standard-Strategien. Schreibe Code in die selectAction()-Funktion – nutze dabei Hilfsfunktionen wie this.getEstimates() für bisherige Durchschnittswerte oder this.getCounts() für die Anzahl der Tests pro Variante. Speichern, aktivieren, fertig!" /></span>
              <span class="custom-chevron" :class="{ open: customOpen }"
                >▾</span
              >
            </div>
          </summary>
          <div class="custom-body">
            <AlgorithmEditor
              @policyLoaded="onCustomPolicyLoaded"
              @policyRemoved="onCustomPolicyRemoved"
            />
          </div>
        </details>
        </div>
      </div>
    </transition>
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
import InfoTooltip from "./InfoTooltip.vue";
import NumericStepper from "./ui/NumericStepper.vue";
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
  greedy: {
    optimisticInitialValue: number;
    variants: Array<{ optimisticInitialValue: number }>;
  };
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
    variants: Array.isArray(props.policyConfigs?.greedy?.variants)
      ? [...(props.policyConfigs?.greedy?.variants ?? [])]
      : [],
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
const algoOpen = reactive({
  greedy: false,
  eps: false,
  ucb: false,
  thompson: false,
});

function ensureVariantDefaults(source?: any) {
  if (
    !Array.isArray(source?.greedy?.variants) &&
    !localPolicies.greedy.variants.length
  ) {
    localPolicies.greedy.variants.push({
      optimisticInitialValue: localPolicies.greedy.optimisticInitialValue,
    });
  }
  if (
    !Array.isArray(source?.epsgreedy?.variants) &&
    !localPolicies.epsgreedy.variants.length
  ) {
    localPolicies.epsgreedy.variants.push({
      epsilon: localPolicies.epsgreedy.epsilon,
      optimisticInitialValue: localPolicies.epsgreedy.optimisticInitialValue,
    });
  }
  if (
    !Array.isArray(source?.ucb?.variants) &&
    !localPolicies.ucb.variants.length
  ) {
    localPolicies.ucb.variants.push({
      confidence: localPolicies.ucb.confidence,
      optimisticInitialValue: localPolicies.ucb.optimisticInitialValue,
    });
  }
  if (
    !Array.isArray(source?.thompson?.variants) &&
    !localPolicies.thompson.variants.length
  ) {
    localPolicies.thompson.variants.push({
      priorVariance: localPolicies.thompson.priorVariance ?? 1,
    });
  }
}

ensureVariantDefaults(props.policyConfigs);

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
    localPolicies.greedy.variants = Array.isArray(p.greedy?.variants)
      ? [...p.greedy.variants]
      : [];

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

    ensureVariantDefaults(p);
  },
  { deep: true, immediate: true },
);

watch(
  () => props.open,
  (v) => (openLocal.value = !!v),
  { immediate: true },
);

watch(
  () => localEnv.type,
  (type, prev) => {
    if (type === prev) return;
    if (!localPolicies.thompson.variants.length) {
      localPolicies.thompson.variants.push({
        priorVariance: localPolicies.thompson.priorVariance ?? 1,
      });
    }
    ensureVariantDefaults(props.policyConfigs);
    emitPolicies();
  },
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
      variants: [...localPolicies.greedy.variants],
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
      priorVariance: localPolicies.thompson.priorVariance,
      variants: [...localPolicies.thompson.variants],
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

function toggleAlgo(key: keyof typeof algoOpen) {
  algoOpen[key] = !algoOpen[key];
}

/* Varianten-Handler – nur für parameterisierte Algos */
function addGreedyVariant() {
  localPolicies.greedy.variants.push({
    optimisticInitialValue: localPolicies.greedy.optimisticInitialValue,
  });
  algoOpen.greedy = true;
  emitPolicies();
  nextTick();
}
function removeGreedyVariant(i: number) {
  localPolicies.greedy.variants.splice(i, 1);
  emitPolicies();
}

function addEpsVariant() {
  localPolicies.epsgreedy.variants.push({
    epsilon: 0.1,
    optimisticInitialValue: localEnv.type === "bernoulli" ? 0.6 : 150,
  });
  algoOpen.eps = true;
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
  algoOpen.ucb = true;
  emitPolicies();
  nextTick();
}
function removeUcbVariant(i: number) {
  localPolicies.ucb.variants.splice(i, 1);
  emitPolicies();
}

function addThompsonVariant() {
  localPolicies.thompson.variants.push({
    priorVariance: localPolicies.thompson.priorVariance ?? 1
  });
  algoOpen.thompson = true;
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
  background: transparent;
  border: none;
  border-radius: 0;
}
.accordion-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  background: #171717;
  margin-bottom: 8px;
  cursor: pointer;
}
.accordion-head h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}
.meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
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
.btn-pill {
  border-radius: 999px;
}

.table-wrap {
  margin-top: 8px;
  border: 1px solid #222;
  border-radius: 10px;
  background: var(--bg-14);
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
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
  justify-content: flex-end;
}

.input {
  width: 100%;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--br-22);
  border-radius: 9px;
  background: #121212;
  color: #f1f1f1;
  box-sizing: border-box;
}
.input--xs {
  height: 30px;
  max-width: 120px;
  padding: 0 8px;
}
.input--seed {
  min-width: 120px;
  max-width: 180px;
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
.algo-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: transparent;
  border: none;
  color: inherit;
  padding: 6px 4px;
  cursor: pointer;
  text-align: left;
}
.algo-toggle:focus-visible {
  outline: 2px solid #3aa9d6;
  outline-offset: 2px;
}
.algo-body {
  margin-top: 8px;
}
.algo-chevron {
  transition: transform 0.18s ease;
  font-size: 16px;
}
.algo-chevron.open {
  transform: rotate(180deg);
}
.algo-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 0;
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
.pill-custom {
  border-color: #ef5350;
  color: #ffd7d7;
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
.variants-table--greedy .variants-row,
.variants-table--greedy .variants-row--head {
  grid-template-columns: minmax(120px, 2fr) minmax(140px, 1fr) minmax(100px, 0.6fr);
}
.variants-row {
  display: grid;
  grid-template-columns: minmax(120px, 2fr) minmax(140px, 1fr) minmax(140px, 1fr) minmax(100px, 0.6fr);
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
  min-width: 0;
  overflow: hidden;
}
.cell:last-child {
  border-right: none;
}
.cell--end {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
/* Constrain NumericStepper in table cells */
.cell :deep(.control-group) {
  max-width: 100%;
  width: 100%;
}
/* Wider seed stepper for up to 10 digits */
.seed-stepper :deep(.control-group) {
  max-width: 100%;
  min-width: 280px;
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
  list-style: none;
}
.custom summary::-webkit-details-marker {
  display: none;
}
.custom summary:hover {
  background: #1b1b1b;
}
.custom-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}
.custom-chevron {
  transition: transform 0.18s ease;
}
.custom-chevron.open {
  transform: rotate(180deg);
}
.custom-body {
  padding: 10px;
  border-top: 1px solid var(--br-22);
  background: #151515;
  border-radius: 0 0 12px 12px;
}

/* Animation */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (max-width: 980px) {
  .grid,
  .algo-grid {
    grid-template-columns: 1fr;
  }
}
</style>
