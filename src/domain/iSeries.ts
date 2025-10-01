// kleine, neutrale Beschreibung einer Serie (manuell oder Algo)
// Farbe optional, für Legende/Chart später nice-to-have 🤓
export type SeriesKind = "manual" | "algo";

export interface iSeriesRef {
  id: string; // stable key, z.B. "manual" oder "algo:greedy"
  label: string; // UI-Anzeige, z.B. "Manuell" oder "Greedy"
  kind: SeriesKind; // "manual" | "algo"
  color?: string; // optional für spätere Charts
}
