<template>
  <div class="seg" role="tablist" aria-label="Modus wählen">
    <button
      class="seg-btn"
      :class="{ active: local === 'manual' }"
      role="tab"
      @click="set('manual')"
    >
      Manuell
    </button>
    <button
      class="seg-btn"
      :class="{ active: local === 'algo' }"
      role="tab"
      @click="set('algo')"
    >
      Algorithmus
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

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

function set(v: Mode) {
  if (local.value === v) return;
  local.value = v;
  emit("update:modelValue", v);
  emit("change", v);
}
</script>

<style scoped>
/* Switch für den Header */
.seg {
  display: grid;
  grid-auto-flow: column;
  gap: 0;
  height: 36px;
  background: #111;
  border: 1px solid #333;
  border-radius: 999px;
  overflow: hidden;
}
.seg-btn {
  padding: 0 14px;
  border: 0;
  background: transparent;
  color: #cfd3d8;
  cursor: pointer;
  font-weight: 600;
  transition: background 120ms ease;
}
.seg-btn + .seg-btn {
  border-left: 1px solid #2a2a2a;
}
.seg-btn.active {
  background: #ff0000;
  color: #fff;
}
.seg-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
