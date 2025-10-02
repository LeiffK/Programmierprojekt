// Meta-Daten einer Serie (Name, Farbe, Sichtbarkeit...) – nix mit Punkten
export interface iSeriesConfig {
  id: string;
  label: string;
  color: string;
  visible: boolean;
  kind?: "manual" | "algo"; //@ Leiff bitte hier nochmal drüber schauen <<-- Hab das hier eingeführt, weil sonst die CI CD Prüfung anschlägt
}
