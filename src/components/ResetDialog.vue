<template>
  <div
    v-if="open"
    class="modal-backdrop"
    @click.self="$emit('close')"
    @keydown.esc.prevent.stop="$emit('close')"
  >
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-title"
      aria-describedby="reset-desc"
      tabindex="-1"
      ref="modalRef"
    >
      <div class="modal-header">
        <div class="modal-title" id="reset-title">Zurücksetzen bestätigen</div>
      </div>
      <div class="modal-body" id="reset-desc">
        <p>
          Alle Daten und Einstellungen gehen verloren. Dieser Schritt kann nicht
          rückgängig gemacht werden.
        </p>
      </div>
      <div class="modal-footer">
        <button
          class="btn btn-ghost btn-pill"
          type="button"
          @click="$emit('close')"
          ref="cancelBtnRef"
        >
          Abbrechen
        </button>
        <button
          class="btn btn-danger btn-pill"
          type="button"
          @click="$emit('confirm')"
          ref="confirmBtnRef"
        >
          Jetzt zurücksetzen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm"): void;
}>();

const modalRef = ref<HTMLDivElement | null>(null);
const cancelBtnRef = ref<HTMLButtonElement | null>(null);
const confirmBtnRef = ref<HTMLButtonElement | null>(null);

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      await nextTick();
      confirmBtnRef.value?.focus?.();
    }
  },
);
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 10, 0.8);
  backdrop-filter: blur(3px);
  display: grid;
  place-items: center;
  z-index: 1000;
  padding: 16px;
}
.modal {
  width: 100%;
  max-width: 520px;
  background: #181818;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.7);
  outline: none;
}
.modal-header {
  padding: 14px 16px 6px 16px;
  border-bottom: 1px solid #2d2d2d;
  background: #1c1c1c;
}
.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: #f0f0f0;
}
.modal-body {
  padding: 16px;
  color: #e5e7eb;
  background: #181818;
}
.modal-footer {
  padding: 12px 16px 16px 16px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid #2d2d2d;
  background: #1c1c1c;
}

.btn {
  height: 36px;
  line-height: 36px;
  padding: 0 14px;
  border: 1px solid #333;
  background: #1a1a1a;
  color: #e5e5e5;
  border-radius: 10px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.btn:hover {
  background: #202020;
  border-color: #3a3a3a;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.08);
}
.btn-pill {
  border-radius: 999px;
}
.btn-ghost {
  background: #171717;
  border-color: #2a2a2a;
}
.btn-ghost:hover {
  background: #1d1d1d;
  border-color: #333;
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.06);
}
.btn-danger {
  background: #7a1f1f;
  border-color: #9b2b2b;
}
.btn-danger:hover {
  background: #8b2525;
  border-color: #ab3b3b;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.25);
}
</style>
