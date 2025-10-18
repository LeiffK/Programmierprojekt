<template>
  <div class="field">
    <label v-if="label" class="label">{{ label }}</label>

    <div class="control-group" :class="{ disabled }">
      <button
        class="group-btn"
        type="button"
        :disabled="disabled || atMin"
        title="Verringern"
        @click="onBump(-step)"
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M5 12h14"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
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
        title="Erhöhen"
        @click="onBump(step)"
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
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
  const n = Number(raw.replace(",", "."));
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
  height: 46px;
  width: 100%;
  max-width: 180px;
  display: grid;
  grid-template-columns: 42px 1fr 42px;
  gap: 1px;
  background: #2a2a2a;
  border: 1px solid #333;
  border-radius: 10px;
  overflow: hidden;
}
.control-group.disabled {
  opacity: 0.6;
}
.group-btn {
  height: 44px;
  width: 42px;
  background: #1a1a1a;
  color: #999;
  border: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.group-btn svg {
  width: 18px;
  height: 18px;
}

.group-btn:hover:not(:disabled) {
  background: #252525;
  color: #fff;
}

.group-btn:active:not(:disabled) {
  background: #2a2a2a;
  transform: scale(0.95);
}

.group-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.group-btn:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px rgba(79, 195, 247, 0.3);
}

.group-input {
  height: 44px;
  width: 100%;
  margin: 0;
  padding: 0;
  background: #111;
  color: #f0f0f0;
  border: 0;
  outline: none;
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  line-height: 44px;
  box-sizing: border-box;
}

.group-input:focus {
  background: #151515;
}

.label {
  margin-bottom: 6px;
  color: var(--muted);
  font-size: var(--fs-12);
}
</style>
