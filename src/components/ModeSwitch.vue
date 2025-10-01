<template>
  <div
    class="seg"
    role="tablist"
    aria-label="Modus wählen"
    ref="track"
    :style="{
      // CSS-Variablen für die Pille (werden per JS gesetzt)
      '--ind-x': indX + 'px',
      '--ind-w': indW + 'px',
    }"
  >
    <span class="seg-indicator" aria-hidden="true"></span>

    <button
      ref="btnManual"
      class="seg-btn"
      :class="{ active: local === 'manual' }"
      role="tab"
      :aria-selected="local === 'manual'"
      @click="set('manual')"
      @keydown.left.prevent="set('manual')"
      @keydown.right.prevent="set('algo')"
    >
      Manuell
    </button>

    <button
      ref="btnAlgo"
      class="seg-btn"
      :class="{ active: local === 'algo' }"
      role="tab"
      :aria-selected="local === 'algo'"
      @click="set('algo')"
      @keydown.left.prevent="set('manual')"
      @keydown.right.prevent="set('algo')"
    >
      Algorithmus
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from "vue";

type Mode = "manual" | "algo";
const props = defineProps<{ modelValue: Mode }>();
const emit = defineEmits<{
  (e: "update:modelValue", v: Mode): void;
  (e: "change", v: Mode): void;
}>();

const local = ref<Mode>(props.modelValue ?? "manual");
watch(
  () => props.modelValue,
  (v) => (local.value = v ?? "manual"),
);

const track = ref<HTMLElement | null>(null);
const btnManual = ref<HTMLButtonElement | null>(null);
const btnAlgo = ref<HTMLButtonElement | null>(null);

const indX = ref(0);
const indW = ref(0);

function updateIndicator() {
  const el = local.value === "manual" ? btnManual.value : btnAlgo.value;
  const wrap = track.value;
  if (!el || !wrap) return;
  const btnRect = el.getBoundingClientRect();
  const wrapRect = wrap.getBoundingClientRect();

  indX.value = btnRect.left - wrapRect.left + PADDING;

  indW.value = btnRect.width - PADDING * 2;
}

const PADDING = 2;

function set(v: Mode) {
  if (local.value === v) return;
  local.value = v;
  emit("update:modelValue", v);
  emit("change", v);
  nextTick(updateIndicator);
}

onMounted(() => {
  nextTick(updateIndicator);
  const r = () => updateIndicator();
  window.addEventListener("resize", r, { passive: true });

  document.fonts?.ready?.then(updateIndicator);
});
watch(local, () => nextTick(updateIndicator));
</script>

<style scoped>
.seg {
  --h: 46px;
  position: relative;
  display: grid;
  grid-auto-flow: column;
  gap: 0;
  height: var(--h);
  background: #111;
  border: 1px solid #333;
  border-radius: var(--radius-pill);
  padding: 2px;
  overflow: hidden;
}

.seg-indicator {
  position: absolute;
  top: 2px;
  left: 0;
  width: var(--ind-w, 50%);
  height: calc(var(--h) - 4px);
  background: #e6e6e6;
  border-radius: 999px;
  box-shadow: var(--shadow-1);
  transform: translateX(var(--ind-x, 0));
  transition:
    transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1),
    width 220ms cubic-bezier(0.22, 0.61, 0.36, 1);
  will-change: transform, width;
  z-index: 0;
}

.seg-btn {
  position: relative;
  z-index: 1;
  height: calc(var(--h) - 4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  margin: 2px;
  border: 0;
  background: transparent;
  color: #cfd3d8;
  cursor: pointer;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.1px;
  border-radius: 999px;
  transition:
    color 140ms cubic-bezier(0.2, 0.8, 0.2, 1),
    transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.seg-btn:hover {
  transform: translateY(-1px);
}
.seg-btn:active {
  transform: translateY(0);
}
.seg-btn.active {
  color: #111;
}

.seg-btn:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.15);
}

@media (prefers-reduced-motion: reduce) {
  .seg-indicator,
  .seg-btn {
    transition-duration: 0.01ms;
  }
}
:root {
  --ind-x: 0px;
  --ind-w: 50%;
  --h: 32px;
  --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.12);
}
</style>
