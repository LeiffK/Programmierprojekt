<template>
  <section class="card">
    <!-- Kopf wie beim Vergleich-Panel: Titel links, Badges/Actions rechts -->
    <div
      class="header"
      @click="toggle()"
      role="button"
      tabindex="0"
      @keydown.enter.prevent="toggle()"
      @keydown.space.prevent="toggle()"
    >
      <h2>Debug &amp; Log</h2>

      <div class="head-actions" @click.stop>
        <span class="pill-count">{{ count }} Einträge</span>
        <button class="btn ghost" type="button" @click="toggle()">
          {{ open ? "Ausblenden" : "Einblenden" }}
        </button>
      </div>
    </div>

    <transition name="fade-slide">
      <div v-if="open" class="body">
        <div class="toolbar">
          <button class="btn ghost" type="button" @click="copy()">
            Kopieren
          </button>
          <button class="btn ghost" type="button" @click="clear()">
            Leeren
          </button>
        </div>

        <pre class="pre" aria-live="polite">{{ text }}</pre>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { debug } from "../services/debugStore";

const open = debug.open;
const count = debug.count;

function toggle() {
  debug.toggle();
}
function clear() {
  debug.clear();
}

const text = computed(() =>
  debug.entries.value
    .map((e) => {
      const d = new Date(e.ts);
      const t = `${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes(),
      ).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
      const tag = (e.kind || "info").toUpperCase();
      return `[${t}] ${tag} — ${e.msg}`;
    })
    .join("\n"),
);

async function copy() {
  try {
    await navigator.clipboard.writeText(text.value);
  } catch {
    /* noop */
  }
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  cursor: pointer;
}
.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pill-count {
  height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border: 1px solid var(--line, #2a2a2a);
  border-radius: 999px;
  background: #171717;
  color: #cfd3d8;
  font-size: 12px;
}
.btn {
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--line, #2a2a2a);
  background: #171717;
  color: #d9d9d9;
  cursor: pointer;
}
.btn.ghost:hover {
  filter: brightness(1.05);
}
.body {
  margin-top: 8px;
}
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.pre {
  background: #111;
  border: 1px solid var(--line, #2a2a2a);
  border-radius: 10px;
  padding: 10px;
  max-height: 320px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

/* weich ein-/ausblenden */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition:
    opacity 0.22s cubic-bezier(0.22, 0.61, 0.36, 1),
    transform 0.22s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
