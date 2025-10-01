// Meta-Daten einer Serie (Name, Farbe, Sichtbarkeit...) – nix mit Punkten
export interface iSeriesConfig {
    id: string;
    label: string;
    color: string;
    visible: boolean;
}