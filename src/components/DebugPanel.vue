<template>
  <section class="card">
    <header class="head" @click="toggle()">
      <h2>Debug & Log</h2>
      <div class="meta">
        <span class="badge">{{ filtered.length }} Einträge</span>
        <button class="ghost" type="button">
          {{ open ? "Ausblenden" : "Einblenden" }}
        </button>
      </div>
    </header>

    <div v-if="open" class="toolbar">
      <div class="chips">
        <button
          v-for="s in sources"
          :key="s"
          class="chip"
          :class="{ active: active.has(s) }"
          @click="toggleSource(s)"
        >
          {{ s }}
        </button>
      </div>
      <div class="tools">
        <label class="opt">
          <input type="checkbox" v-model="autoScroll" />
          Autoscroll
        </label>
        <button class="ghost" type="button" @click="clear()">Leeren</button>
      </div>
    </div>

    <div v-if="open" class="logbox" ref="boxRef">
      <div
        v-for="e in filtered"
        :key="e.id"
        class="row"
        :class="`lv-${e.level}`"
        :title="new Date(e.ts).toLocaleTimeString()"
      >
        <span class="time">{{ time(e.ts) }}</span>
        <span class="src">{{ e.source }}</span>
        <span class="msg">{{ e.message }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch, toRefs } from "vue";
import { debugBus } from "../services/debugBus";

const props = defineProps<{ open?: boolean }>();
const emit = defineEmits<{ (e: "update:open", v: boolean): void }>();

const open = ref<boolean>(props.open ?? false);
watch(
  () => props.open,
  (v) => v != null && (open.value = !!v),
);

function toggle() {
  open.value = !open.value;
  emit("update:open", open.value);
}

const entries = debugBus.entries;

const sources = computed(() => {
  const set = new Set<string>();
  for (const e of entries.value) set.add(e.source);
  return [...set].sort();
});

const active = ref<Set<string>>(new Set()); // leer = alle
function toggleSource(s: string) {
  const a = new Set(active.value);
  a.has(s) ? a.delete(s) : a.add(s);
  active.value = a;
}

const filtered = computed(() => {
  const useAll = active.value.size === 0;
  return entries.value.filter((e) => useAll || active.value.has(e.source));
});

function clear() {
  debugBus.clear();
}

function time(ts: number) {
  return new Date(ts).toLocaleTimeString();
}

const boxRef = ref<HTMLElement | null>(null);
const autoScroll = ref(true);
watch(filtered, () => {
  if (!autoScroll.value) return;
  requestAnimationFrame(() => {
    const el = boxRef.value;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  });
});
</script>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}
.meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #1e1e1e;
  border: 1px solid #333;
}
.ghost {
  background: #1a1a1a;
  color: #ddd;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 999px;
  background: #151515;
  color: #ddd;
  border: 1px solid #333;
  cursor: pointer;
}
.chip.active {
  background: #262626;
  border-color: #555;
}

.tools {
  display: flex;
  align-items: center;
  gap: 10px;
}
.opt {
  font-size: 12px;
  color: #bbb;
  display: flex;
  align-items: center;
  gap: 6px;
}

.logbox {
  margin-top: 10px;
  max-height: 260px;
  overflow: auto;
  background: #111;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
}
.row {
  display: grid;
  grid-template-columns: 88px 140px 1fr;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px solid #1e1e1e;
}
.row:last-child {
  border-bottom: 0;
}
.time {
  color: #9aa;
  font-variant-numeric: tabular-nums;
}
.src {
  color: #ccc;
}
.msg {
  color: #eee;
}
.lv-event .msg {
  color: #9cf;
}
.lv-warn .msg {
  color: #f5b914;
}
.lv-error .msg {
  color: #ff6b6b;
}
</style>
