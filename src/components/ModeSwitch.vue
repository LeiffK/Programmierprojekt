<template>
  <div class="mode-switch" role="tablist" aria-label="Modus wählen">
    <div class="switch-container">
      <div class="switch-pill" :style="pillStyle"></div>

      <button
        class="mode-btn"
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
        class="mode-btn"
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";

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

const pillStyle = computed(() => {
  const offset = local.value === "manual" ? "0%" : "calc(100% + 4px)";
  return {
    transform: `translateX(${offset})`,
  };
});

function set(v: Mode) {
  if (local.value === v) return;
  local.value = v;
  emit("update:modelValue", v);
  emit("change", v);
}
</script>

<style scoped>
.mode-switch {
  width: 100%;
}

.switch-container {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #0f0f0f;
  border: 1px solid #272727;
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}

.switch-pill {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  background: linear-gradient(135deg, #2a3f5f 0%, #1e2f45 100%);
  border-radius: 9px;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(79, 195, 247, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  z-index: 1;
}

.mode-btn {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: color 0.25s ease;
  color: #888;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.2px;
  min-height: 46px;
}

.mode-btn:hover:not(.active) {
  color: #aaa;
}

.mode-btn.active {
  color: #fff;
}

.mode-btn:focus-visible {
  outline: 2px solid #5eb1e6;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .switch-pill,
  .mode-btn {
    transition-duration: 0.01ms;
  }
}
</style>
