import { reactive } from "vue";
import type { iSeriesConfig } from "../domain/chart/iSeriesConfig";

// winziges „Store“-Modul für Serien-Sichtbarkeit und -Metadaten
const state = reactive<Record<string, iSeriesConfig>>({
  manual: { id: "manual", label: "Manuell", color: "#4caf50", visible: true },
});

export function getSeriesState() {
  return state;
}

export function ensureSeries(id: string, label: string, color: string) {
  if (!state[id]) state[id] = { id, label, color, visible: true };
}

export function setSeriesVisible(id: string, visible: boolean) {
  if (state[id]) state[id].visible = visible;
}

export function resetSeriesStore() {
  Object.keys(state).forEach((k) => delete (state as any)[k]);
  state.manual = {
    id: "manual",
    label: "Manuell",
    color: "#4caf50",
    visible: true,
  };
}

export function ensurePolicies() {
  // gut unterscheidbare Farben (passen zum Chart)
  ensureSeries("greedy", "Greedy", "#4fc3f7");
  ensureSeries("epsgreedy", "Epsilon-Greedy", "#f39c12");
}
