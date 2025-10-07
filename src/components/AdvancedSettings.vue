<template>
  <section class="card">
    <!-- Kopf -->
    <header
        class="head"
        role="button"
        tabindex="0"
        @click="toggle()"
        @keydown.enter.prevent="toggle()"
        @keydown.space.prevent="toggle()"
    >
      <h2>Erweiterte Einstellungen</h2>
      <div class="meta">
        <span class="badge">{{ modeLabel }}</span>
        <button class="ghost" type="button">
          {{ openLocal ? "Einklappen" : "Einblenden" }}
        </button>
      </div>
    </header>

    <transition name="fade-slide">
      <div v-if="openLocal" class="body">
        <!-- UMGEBUNG -->
        <div class="card-subhead">
          <h3>Umgebung</h3>
        </div>

        <div class="env-grid">
          <div class="field col-4">
            <label class="label">Seed</label>
            <div class="inline">
              <input
                  class="control no-spin"
                  type="number"
                  min="0"
                  v-model.number="localEnv.seed"
                  @input="emitEnv()"
              />
              <button
                  type="button"
                  class="ghost roll"
                  title="Seed würfeln"
                  @click="rollSeed"
              >
                🎲 Würfeln
              </button>
            </div>
            <small class="hint muted">Änderungen werden automatisch initialisiert.</small>
          </div>
        </div>

        <!-- ALGORITHMEN -->
        <div class="card-subhead">
          <h3>Algorithmen</h3>
        </div>

        <div class="table" role="table" aria-label="Algorithmus-Parameter">
          <div class="thead" role="rowgroup">
            <div class="tr head" role="row">
              <div class="th col-algo" role="columnheader">Algorithmus</div>
              <div class="th col-param" role="columnheader">Parameter</div>
              <div class="th col-oiv" role="columnheader" title="Optimistic Initial Value">OIV</div>
              <div class="th col-actions" role="columnheader">Aktionen</div>
            </div>
          </div>

          <div class="tbody" role="rowgroup">
            <!-- Greedy -->
            <div class="tr" role="row">
              <div class="td col-algo" role="cell">
                <span class="pill algo">Greedy</span>
              </div>
              <div class="td col-param" role="cell">
                <span class="muted">keine Parameter</span>
              </div>
              <div class="td col-oiv" role="cell">
                <NumericStepper
                    v-model="greedyOIV"
                    :min="-9999"
                    :max="9999"
                    :step="1"
                    @update:model-value="emitPolicies"
                />
              </div>
              <div class="td col-actions" role="cell">
                <span class="muted">—</span>
              </div>
            </div>

            <!-- ε-Greedy Varianten -->
            <div class="tr" v-for="(row, idx) in epsRows" :key="'eps-' + idx" role="row">
              <div class="td col-algo" role="cell">
                <span class="pill algo">ε-Greedy</span>
                <span v-if="idx > 0" class="muted sm">Variante {{ idx + 1 }}</span>
              </div>
              <div class="td col-param" role="cell">
                <div class="inline-controls">
                  <label class="label sm">ε</label>
                  <NumericStepper
                      v-model="row.epsilon"
                      :min="0"
                      :max="1"
                      :step="0.01"
                      @update:model-value="emitPolicies"
                  />
                </div>
              </div>
              <div class="td col-oiv" role="cell">
                <NumericStepper
                    v-model="row.oiv"
                    :min="-9999"
                    :max="9999"
                    :step="1"
                    @update:model-value="emitPolicies"
                />
              </div>
              <div class="td col-actions" role="cell">
                <button
                    class="ghost danger"
                    type="button"
                    :disabled="idx === 0"
                    title="Variante entfernen"
                    @click="removeEps(idx)"
                >
                  Entfernen
                </button>
              </div>
            </div>
          </div>

          <!-- Plus-Zeile -->
          <div class="tfoot" role="rowgroup">
            <div class="tr foot" role="row">
              <div class="td col-algo" role="cell">
                <select class="control" v-model="newAlgo">
                  <option disabled value="">Algorithmus wählen…</option>
                  <option v-for="opt in addableAlgorithms" :key="opt.id" :value="opt.id">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div class="td col-param" role="cell">
                <span class="muted">nur parametrisierbare Algos (ε / c)</span>
              </div>
              <div class="td col-oiv" role="cell">
                <span class="muted">—</span>
              </div>
              <div class="td col-actions" role="cell">
                <button class="ghost" type="button" :disabled="!newAlgo" @click="addSelectedAlgo">
                  + Hinzufügen
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <div class="divider"></div>

        <!-- EIGENER ALGORITHMUS – aufklappbar -->
        <header
            class="subhead"
            role="button"
            tabindex="0"
            @click="toggleCustom()"
            @keydown.enter.prevent="toggleCustom()"
            @keydown.space.prevent="toggleCustom()"
        >
          <h3>Eigener Algorithmus</h3>
          <button class="ghost" type="button">{{ customOpen ? "Einklappen" : "Einblenden" }}</button>
        </header>

        <transition name="fade-slide">
          <div v-if="customOpen" class="custom-card">
            <AlgorithmEditor @policyLoaded="onCustomPolicyLoaded" />
            <small class="hint muted">
              Der geladene eigene Algorithmus wird als separate Serie im Chart angezeigt und im Runner mitgeführt.
            </small>
          </div>
        </transition>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, watch, computed } from "vue";
import NumericStepper from "@/components/ui/NumericStepper.vue";
import AlgorithmEditor from "@/components/AlgorithmEditor.vue";
import type { iEnvConfig } from "../env/Domain/iEnvConfig";

type Mode = "manual" | "algo";
type PolicyId = "greedy" | "epsgreedy" | "ucb";

const props = defineProps<{
  mode: Mode;
  env: iEnvConfig;
  policyConfigs: any;
  open?: boolean;
}>();
const emit = defineEmits<{
  (e: "update:env", v: iEnvConfig): void;
  (e: "update:policyConfigs", v: any): void;
  (e: "update:open", v: boolean): void;
}>();

/* Offen/zu */
const openLocal = ref<boolean>(props.open ?? false);
watch(() => props.open, (v) => { if (typeof v === "boolean") openLocal.value = v; });
function toggle() { openLocal.value = !openLocal.value; emit("update:open", openLocal.value); }
const modeLabel = computed(() => (props.mode === "manual" ? "Manuell" : "Algorithmisch"));

/* Custom-Editor auf/zu */
const customOpen = ref<boolean>(false);
function toggleCustom() { customOpen.value = !customOpen.value; }

/* Env Binding */
const localEnv = reactive<iEnvConfig>({
  type: props.env.type ?? "gaussian",
  arms: props.env.arms ?? 6,
  probs: props.env.probs,
  means: props.env.means,
  stdDev: props.env.stdDev,
  seed: props.env.seed ?? 12345,
});
watch(() => props.env, (v) => Object.assign(localEnv, v ?? {}), { deep: true });
function emitEnv() { emit("update:env", { ...localEnv }); }
watch(localEnv, emitEnv, { deep: true });

/* Seed würfeln */
function rollSeed() {
  localEnv.seed = Math.floor(Math.random() * 1_000_000_000);
  emitEnv();
}

function onCustomPolicyLoaded(policy: any) {
  const out = { ...(props.policyConfigs ?? {}), customPolicy: policy };
  emit("update:policyConfigs", out);
}

/* Tabellenmodell: Greedy + ε-Greedy-Varianten */
const greedyOIV = ref<number>(props.policyConfigs?.greedy?.optimisticInitialValue ?? 100);
type EpsRow = { epsilon: number; oiv: number };
const epsRows = ref<EpsRow[]>([
  { epsilon: props.policyConfigs?.epsgreedy?.epsilon ?? 0.1,
    oiv: props.policyConfigs?.epsgreedy?.optimisticInitialValue ?? 150 },
]);

const addableAlgorithms = computed(() => [
  { id: "epsgreedy" as const, label: "ε-Greedy", enabled: true },
  { id: "ucb" as const, label: "UCB", enabled: !!props.policyConfigs?.ucb || false },
].filter(x => x.enabled));
const newAlgo = ref<"" | PolicyId>("");

function addSelectedAlgo() {
  if (newAlgo.value === "epsgreedy") {
    epsRows.value.push({ epsilon: 0.1, oiv: 150 });
    emitPolicies();
  }
  newAlgo.value = "";
}
function removeEps(idx: number) {
  if (idx === 0) return;
  epsRows.value.splice(idx, 1);
  emitPolicies();
}

/* Policies emittieren */
function emitPolicies() {
  const variants = epsRows.value.map(r => ({ epsilon: r.epsilon, optimisticInitialValue: r.oiv }));
  const out: any = {
    ...props.policyConfigs,
    greedy: { ...(props.policyConfigs?.greedy ?? {}), optimisticInitialValue: greedyOIV.value },
    epsgreedy: {
      ...(props.policyConfigs?.epsgreedy ?? {}),
      epsilon: variants[0]?.epsilon ?? 0.1,
      optimisticInitialValue: variants[0]?.optimisticInitialValue ?? 150,
      variants,
    },
  };
  emit("update:policyConfigs", out);
}

/* Sync */
watch(() => props.policyConfigs?.greedy?.optimisticInitialValue, (v) => {
  if (typeof v === "number") greedyOIV.value = v;
});
watch(() => props.policyConfigs?.epsgreedy as any, (v: any) => {
  if (!v) return;
  const list = Array.isArray(v.variants) && v.variants.length
      ? v.variants
      : [{ epsilon: v.epsilon ?? 0.1, optimisticInitialValue: v.optimisticInitialValue ?? 150 }];
  epsRows.value = list.map((x: any) => ({ epsilon: Number(x.epsilon ?? 0.1), oiv: Number(x.optimisticInitialValue ?? 150) }));
});
</script>

<style scoped>
/* Einheitliche Control-Höhe im Component */
:host { --control-h: 44px; }

.head { display:flex; align-items:center; justify-content:space-between; cursor:pointer; }
.meta { display:flex; align-items:center; gap:8px; }
.badge { display:inline-block; border:1px solid var(--line,#2a2a2a); border-radius:999px; padding:2px 8px; font-size:12px; color:var(--muted); }
.ghost { background:#1a1a1a; color:#ddd; border:1px solid #333; border-radius:8px; padding:6px 12px; cursor:pointer; }
.ghost.danger { color:#ffb3b3; border-color:#553333; }
.body { margin-top:8px; }

.env-grid { display:grid; grid-template-columns:repeat(12,1fr); gap:12px; margin-bottom:12px; }
.field { display:flex; flex-direction:column; gap:6px; min-width:320px; }
.col-4 { grid-column:span 4; }
.inline { display:flex; align-items:center; gap:10px; }

.control {
  height: var(--control-h);
  background:#1a1a1a; border:1px solid #333; color:#fff;
  padding:0 12px; border-radius:10px; min-width:260px;
}

.button-base {
  height: var(--control-h);
  display:inline-flex; align-items:center; justify-content:center;
  border-radius:10px; border:1px solid #333; background:#1a1a1a; color:#ddd;
}

/* würfeln: bewusst breiter und gleiche Höhe wie Input */
.ghost.roll {
  composes: button-base;
  min-width: 140px; /* breiter */
  padding: 0 16px;
}

.label { font-weight:600; }
.hint { margin-top:-2px; }

.card-subhead { margin-top:8px; margin-bottom:8px; }
.table { width:100%; border:1px solid var(--line,#2a2a2a); border-radius:10px; overflow:hidden; }
.thead, .tbody, .tfoot { display:block; }
.tr { display:grid; grid-template-columns: 1.2fr 1fr 0.7fr 0.7fr; align-items:center; }
.tr.head { background:#171717; border-bottom:1px solid var(--line,#2a2a2a); }
.th, .td { padding:10px 12px; border-bottom:1px solid #222; }
.tfoot .tr.foot .td { border-bottom:0; }
.col-actions { text-align:right; }
.pill { display:inline-block; padding:2px 8px; border-radius:999px; border:1px solid var(--line,#2a2a2a); background:#1f1f2b; color:#cfd1ff; font-size:12px; }
.muted { color:var(--muted); } .muted.sm { font-size:12px; }
.inline-controls { display:flex; align-items:center; gap:8px; }

.divider { height:1px; background:#222; margin:16px 0; }
.subhead { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; cursor:pointer; }
.custom-card { border:1px solid #222; border-radius:10px; padding:12px; background:#141414; }

.fade-slide-enter-active, .fade-slide-leave-active { transition: opacity .22s cubic-bezier(.22,.61,.36,1), transform .22s cubic-bezier(.22,.61,.36,1); }
.fade-slide-enter-from, .fade-slide-leave-to { opacity:0; transform:translateY(6px); }
</style>