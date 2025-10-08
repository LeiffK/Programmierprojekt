<template>
  <section class="card">
    <!-- kompletter Header klickbar -->
    <header
      class="accordion-head"
      role="button"
      tabindex="0"
      @click="open = !open"
      @keydown.enter.prevent="open = !open"
      @keydown.space.prevent="open = !open"
    >
      <h2>Debug &amp; Log</h2>
      <div class="meta">
        <span class="badge">{{ entriesLabel }}</span>
        <button class="btn btn-ghost btn-pill" type="button">
          {{ open ? "Einklappen" : "Einblenden" }}
        </button>
      </div>
    </header>

    <transition name="fade-slide">
      <div v-if="open" class="body">
        <ul class="log">
          <li v-for="(line, i) in lines" :key="i">
            <span class="ts">[{{ line.time }}]</span>
            <span class="lvl" :data-lvl="line.level">{{ line.level }}</span>
            <span class="msg">{{ line.text }}</span>
          </li>
        </ul>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import { algorithmsRunner } from "../services/algorithmsRunner";
import { attachRunner } from "../services/debugStore";

const open = ref(false);

type LogLine = {
  time: string;
  level: "INFO" | "RUNNER" | "RESULT" | "ERROR";
  text: string;
};
const lines = ref<LogLine[]>([]);

function push(level: LogLine["level"], text: string) {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  lines.value.unshift({ time: `${hh}:${mm}:${ss}`, level, text });
  if (lines.value.length > 300) lines.value.pop();
}

const off = algorithmsRunner.on((e) => {
  if (e.type === "CONFIGURED") push("INFO", "Konfiguriert.");
  if (e.type === "STARTED") push("RUNNER", "Start.");
  if (e.type === "PAUSED") push("RUNNER", "Pause.");
  if (e.type === "STOPPED") push("RUNNER", `Stop – ${e.payload.reason}`);
  if (e.type === "RESULT") {
    const k = e.payload.step ?? 0;
    const K = e.payload.total ?? 0;
    const id = e.payload.policyId;
    const a = e.payload.action;
    const r = e.payload.reward.toFixed(2);
    const q = Number.isFinite(e.payload.expected)
      ? e.payload.expected.toFixed(2)
      : "—";
    push(
      "RESULT",
      `#${k}/${K} • ${id} • a=${a} • r=${r} • q=${q}${e.payload.isOptimal ? " • optimal" : ""}`,
    );
  }
  if (e.type === "LOG") push("INFO", e.payload.message);
  if (e.type === "ERROR") push("ERROR", e.payload.message);
});

onMounted(() => attachRunner(algorithmsRunner));
onBeforeUnmount(() => off?.());

const entriesLabel = computed(() => `${lines.value.length} Einträge`);
</script>

<style scoped>
.accordion-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  background: #171717;
  margin-bottom: 8px;
  cursor: pointer;
}
.meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.badge {
  display: inline-block;
  border: 1px solid #2a2a2a;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
  color: var(--muted);
}
.btn {
  height: 36px;
  padding: 0 12px;
  border: 1px solid #2d2d2d;
  background: #171717;
  color: #eaeaea;
  border-radius: 999px;
  cursor: pointer;
}
.btn-ghost {
  background: #161616;
}
.btn-pill {
  border-radius: 999px;
}

.body {
  margin-top: 8px;
}
.log {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.log li {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  border: 1px solid #222;
  border-radius: 8px;
  background: #131313;
}
.ts {
  color: #9aa4b2;
}
.lvl {
  font-size: 11px;
  padding: 2px 6px;
  border: 1px solid #2c2c2c;
  border-radius: 999px;
  background: #181818;
  color: #cfcfcf;
}
.lvl[data-lvl="ERROR"] {
  border-color: #5c2b2b;
  color: #ffbdbd;
}
.lvl[data-lvl="RESULT"] {
  border-color: #2b4d5c;
  color: #bdeeff;
}
.msg {
  white-space: pre-wrap;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
