# Bandit-Studio

Interaktive Single-Page-Application zur Simulation und Analyse von Multi-Armed-Bandit-Algorithmen am Beispiel von YouTube-Thumbnail-Tests.

## Was kann die App?

- **Zwei Test-Szenarien**:
  - Gaussian (Watchtime in Sekunden)
  - Bernoulli (Klicks ja/nein)
- **Algorithmen-Vergleich**: Greedy, Epsilon-Greedy, UCB, Thompson Sampling, Gradient Bandit
- **Eigene Algorithmen**: TypeScript-Code direkt im Editor eingeben und testen
- **Live-Visualisierung**: Echtzeit-Charts mit Apache ECharts
- **Interaktives Tutorial**: Geführte Einführung via Shepherd.js
- **Vollständig lokal**: Keine Backend-Kommunikation, alles läuft im Browser

## Installation

**Voraussetzungen**: Node.js (LTS-Version empfohlen)

```bash
# Repository klonen
git clone https://github.com/LeiffK/Programmierprojekt.git
cd Programmierprojekt

# Dependencies installieren
npm install

# Development Server starten
npm run dev
```

Die App läuft dann unter `http://localhost:5173`

## Verfügbare Scripts

```bash
npm run dev        # Development Server starten
npm run build      # Production Build erstellen
npm run preview    # Build lokal testen
npm run test       # Tests ausführen (Vitest)
npm run type-check # TypeScript-Typen prüfen
npm run format     # Code formatieren (Prettier)
```

## Schnellstart

1. Environment-Typ wählen (Gaussian oder Bernoulli)
2. Anzahl der Thumbnails und Test-Iterationen festlegen
3. Algorithmen konfigurieren und starten
4. Ergebnisse in Echtzeit-Charts und Tabellen analysieren

## Tech-Stack

- **Frontend**: Vue 3 (Composition API, `<script setup>`)
- **Sprache**: TypeScript
- **Build**: Vite
- **UI**: Naive UI + eigenes Design-System (CSS Custom Properties)
- **Charts**: Apache ECharts + vue-echarts
- **Tutorial**: Shepherd.js
- **Testing**: Vitest
- **Styling**: TailwindCSS

## Projektstruktur

```
src/
├── algorithms/     # Bandit-Algorithmen (Greedy, UCB, Thompson, etc.)
├── env/           # Umgebungen (Bernoulli, Gaussian)
├── components/    # Vue-Komponenten
├── composables/   # Wiederverwendbare Composition-Functions
├── services/      # Business-Logik und State
├── utils/         # Helper-Funktionen
├── domain/        # TypeScript Interfaces und Types
├── content/       # Statische Inhalte (z.B. Tutorial-Texte)
├── tests/         # Unit-Tests
└── styles/        # Globale CSS (tokens, utilities, motion)
```

## Tests

```bash
npm run test              # Alle Tests ausführen
npm run test -- --ui      # Tests mit UI
npm run test -- --coverage # Coverage-Report generieren
```
