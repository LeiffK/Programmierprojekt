<template>
  <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal">
      <header class="modal-head">
        <h3>Wahre Werte der Thumbnails</h3>
        <button class="btn btn-ghost btn-pill" @click="$emit('close')">
          Schließen
        </button>
      </header>
      <div class="modal-body">
        <p class="description">
          Diese Werte zeigen die tatsächliche Performance jedes Thumbnails. Das
          beste Thumbnail hat den höchsten Wert.
        </p>
        <div class="truth-grid">
          <div
            v-for="(value, index) in truthValues"
            :key="index"
            class="truth-card"
            :class="{ 'is-best': index === bestIndex }"
          >
            <div class="truth-label">
              <span class="thumb-name"
                >Thumbnail {{ String.fromCharCode(65 + index) }}</span
              >
              <span v-if="index === bestIndex" class="best-badge"
                >★ Bestes</span
              >
            </div>
            <div class="truth-value">{{ value.toFixed(3) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  open: boolean;
  truthValues: number[];
}>();

defineEmits<{ (e: "close"): void }>();

const bestIndex = computed(() => {
  if (!props.truthValues || props.truthValues.length === 0) return -1;
  let maxIdx = 0;
  let maxVal = props.truthValues[0];
  for (let i = 1; i < props.truthValues.length; i++) {
    if (props.truthValues[i] > maxVal) {
      maxVal = props.truthValues[i];
      maxIdx = i;
    }
  }
  return maxIdx;
});
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 10px;
}
.modal {
  width: min(700px, 98%);
  max-height: 90vh;
  background: #141414;
  border: 1px solid #262626;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid #222;
  background: #171717;
}
.modal-body {
  padding: 20px;
  overflow: auto;
  flex: 1;
  min-height: 0;
}
.description {
  color: #aaa;
  margin-bottom: 24px;
  line-height: 1.5;
}
.truth-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
.truth-card {
  background: #1a1a1a;
  border: 2px solid #2a2a2a;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s ease;
}
.truth-card.is-best {
  background: linear-gradient(135deg, #1e3a1e 0%, #1a1a1a 100%);
  border-color: #4caf50;
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.2);
}
.truth-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 8px;
}
.thumb-name {
  font-weight: 600;
  color: #eaeaea;
  font-size: 14px;
}
.best-badge {
  background: #4caf50;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
}
.truth-value {
  font-size: 28px;
  font-weight: 700;
  color: #4fc3f7;
  font-variant-numeric: tabular-nums;
}
.truth-card.is-best .truth-value {
  color: #66bb6a;
}
.btn {
  height: 36px;
  padding: 0 14px;
  border: 1px solid #2d2d2d;
  background: #171717;
  color: #eaeaea;
  border-radius: 10px;
  cursor: pointer;
}
.btn:hover {
  background: #1b1b1b;
}
.btn-pill {
  border-radius: 999px;
}
.btn-ghost {
  background: #161616;
}
</style>
