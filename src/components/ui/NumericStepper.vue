<template>
  <div class="field">
    <label v-if="label" class="label">{{ label }}</label>

    <div class="control-group" :class="{ disabled }">
      <button
        class="group-btn"
        type="button"
        :disabled="disabled || atMin"
        title="−"
        @click="onBump(-step)"
      >
        −
      </button>

      <input
        class="group-input"
        :value="displayVal"
        :disabled="disabled"
        inputmode="numeric"
        @input="onInput"
        @blur="normalize"
        @keydown.arrow-up.prevent="onBump(step)"
        @keydown.arrow-down.prevent="onBump(-step)"
      />

      <button
        class="group-btn"
        type="button"
        :disabled="disabled || atMax"
        title="+"
        @click="onBump(step)"
      >
        +
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: number;
    label?: string;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
  }>(),
  {
    min: 0,
    max: Number.POSITIVE_INFINITY,
    step: 1,
    disabled: false,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", v: number): void;
  (e: "bump", payload: { delta: number; value: number }): void; // fürs Debuggen: welche Richtung?
}>();

// interner Buffer, damit man auch "leere" Eingaben tippen kann ohne sofort zu clampen
const buf = ref<number>(props.modelValue);

watch(
  () => props.modelValue,
  (v) => {
    buf.value = v;
  },
);

const displayVal = computed(() => String(buf.value ?? ""));

// Grenzen prüfn… prüfe, nicht prüfn. (Ups.)
const atMin = computed(() => buf.value <= props.min);
const atMax = computed(() => buf.value >= props.max);

function clamp(n: number) {
  if (Number.isNaN(n)) n = props.min;
  n = Math.max(props.min, Math.min(props.max, n));
  // stepweise runden (nur bei ganzzahligen Steps sinnvoll, hier ok)
  return n;
}

function onBump(d: number) {
  const next = clamp((buf.value ?? 0) + d);
  buf.value = next;
  emit("update:modelValue", next);
  emit("bump", { delta: d, value: next });
}

function onInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value.trim();
  const n = Number(raw.replace(",", ".")); // notfalls Komma nach Punkt (wir sind nett)
  buf.value = n;
}

function normalize() {
  const next = clamp(Number(buf.value));
  buf.value = next;
  emit("update:modelValue", next);
}
</script>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
}
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
.control-group.disabled {
  opacity: 0.6;
}
.group-btn {
  height: 42px;
  width: 44px;
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
.group-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
