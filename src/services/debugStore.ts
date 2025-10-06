import { ref, computed } from "vue";

export type DebugKind = "info" | "env" | "runner" | "algo" | "result" | "error";

export interface DebugEntry {
  id: string;
  ts: number;
  kind: DebugKind;
  msg: string;
  data?: unknown;
}

const entries = ref<DebugEntry[]>([]);
const open = ref(false);

const count = computed(() => entries.value.length);

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function push(kind: DebugKind, msg: string, data?: unknown) {
  entries.value.push({ id: uid(), ts: Date.now(), kind, msg, data });
}

export const debug = {
  /** Zustand */
  entries,
  open,
  count,

  /** Panel steuern */
  toggle() {
    open.value = !open.value;
  },
  show() {
    open.value = true;
  },
  hide() {
    open.value = false;
  },

  /** Logging */
  clear() {
    entries.value = [];
  },
  log(msg: string, kind: DebugKind = "info", data?: unknown) {
    push(kind, msg, data);
  },
  error(msg: string, data?: unknown) {
    push("error", msg, data);
  },
};

/**
 * Optionaler Helper: Runner anhängen und Events automatisch loggen.
 * Rückgabe ist der Off-Handler.
 */
export function attachRunner(runner: {
  on: (fn: (e: any) => void) => () => void;
}) {
  return runner.on((e: any) => {
    switch (e?.type) {
      case "READY":
        debug.log("Runner bereit.", "runner");
        break;
      case "CONFIGURED":
        debug.log(
          `Konfiguriert • n=${e.payload?.totalSteps} • rate=${e.payload?.rate}/s`,
          "runner",
          e.payload,
        );
        break;
      case "STARTED":
        debug.log("Lauf gestartet.", "runner");
        break;
      case "PAUSED":
        debug.log("Pausiert.", "runner");
        break;
      case "STOPPED":
        debug.log(`Gestoppt • ${e.payload?.reason ?? "-"}`, "runner");
        break;
      case "RESULT":
        debug.log(
          `#${e.payload?.step}/${e.payload?.total} • ${e.payload?.policyId} • a=${e.payload?.action} • r=${Number(e.payload?.reward).toFixed(2)}${e.payload?.isOptimal ? " • optimal" : ""}`,
          "result",
          e.payload,
        );
        break;
      case "LOG":
        debug.log(String(e.payload?.message ?? ""), "runner");
        break;
      case "ERROR":
        debug.error(String(e.payload?.message ?? "Unbekannter Fehler"), e);
        break;
      default:
        debug.log(`Event: ${String(e?.type)}`, "info", e);
    }
  });
}
