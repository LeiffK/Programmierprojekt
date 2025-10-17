<template>
  <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal">
      <header class="modal-head">
        <h3>Banditen-Thematik verstehen</h3>
        <button class="btn btn-ghost btn-pill" @click="$emit('close')">
          Schließen
        </button>
      </header>
      <div class="modal-body">
        <div class="html-body" v-html="html"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ open: boolean; html: string }>();
defineEmits<{ (e: "close"): void }>();
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
  padding: 20px;
}
.modal {
  width: min(1400px, 100%);
  max-height: 90vh;
  background: #141414;
  border: 1px solid #262626;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
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
  padding: 16px;
  overflow: auto;
  max-height: calc(90vh - 60px);
}
.html-body :is(h1, h2, h3) {
  margin: 16px 0 8px 0;
}
.html-body p {
  margin: 8px 0;
  color: #ddd;
}
.html-body code,
.html-body kbd {
  background: #111;
  border: 1px solid #222;
  border-radius: 6px;
  padding: 1px 6px;
}
.html-body ul {
  margin: 8px 0 8px 16px;
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
