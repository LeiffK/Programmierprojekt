// src/services/debugBus.ts
import { ref, readonly } from "vue";

export type DebugLevel = "info" | "event" | "warn" | "error";

export interface DebugEntry {
  id: number;
  ts: number; // epoch ms
  source: string; // z.B. "env", "runner", "manual", "algo:greedy"
  level: DebugLevel;
  message: string;
  meta?: unknown;
}

const entries = ref<DebugEntry[]>([]);
let nextId = 1;

function push(
  source: string,
  level: DebugLevel,
  message: string,
  meta?: unknown,
) {
  entries.value.push({
    id: nextId++,
    ts: Date.now(),
    source,
    level,
    message,
    meta,
  });
  // Ringpuffer: hält die letzten 1000 Einträge
  if (entries.value.length > 1000)
    entries.value.splice(0, entries.value.length - 1000);
}

export const debugBus = {
  entries: readonly(entries),
  clear() {
    entries.value = [];
  },
  info(source: string, message: string, meta?: unknown) {
    push(source, "info", message, meta);
  },
  event(source: string, message: string, meta?: unknown) {
    push(source, "event", message, meta);
  },
  warn(source: string, message: string, meta?: unknown) {
    push(source, "warn", message, meta);
  },
  error(source: string, message: string, meta?: unknown) {
    push(source, "error", message, meta);
  },
};
