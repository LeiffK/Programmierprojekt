# k-Armed Bandit Tool

Eine lokal laufendes, visuell hochwertiges Single Page Application (SPA) Tool zur Konfiguration, Simulation und Analyse von Multi-Armed-Bandit-Algorithmen in zwei Umgebungen: Bernoulli (binär) und Gaussian (kontinuierlich). Das Tool unterstützt Standardalgorithmen und bietet eine intuitive UI mit Live-Feedback und Vergleichsmöglichkeiten.

# Technologie-Stack und Entwicklungsebene

Die Anwendung basiert auf einem modernen und performanten Technologie-Stack:

## Vue 3 + TypeScript + Vite

- Vue 3 ist ein weit verbreitetes, modernes JavaScript-Framework zur einfachen und schnellen Erstellung von Benutzeroberflächen.

- TypeScript ergänzt JavaScript mit statischer Typisierung, was hilft, Fehler frühzeitig zu erkennen und den Code besser wartbar zu machen.

- Vite ist ein schneller Entwicklungsserver und Build-Tool, das für moderne Frontend-Projekte optimiert ist und kurze Start- und Aktualisierungszeiten bietet.

Die Vorlage verwendet dabei Vue 3's <script setup> Syntax für Single File Components (SFCs), eine moderne und vereinfachte Art, Komponenten zu schreiben. Weitere Details dazu findest Du in der offiziellen Vue 3 Dokumentation.

Für einen Überblick über empfohlene Projekt-Einrichtung und IDE-Unterstützung mit TypeScript im Vue-Umfeld ist die Vue TypeScript Guide eine wertvolle Ressource.

# Features

- Auswählbarer Bandit-Typ (Bernoulli, Gaussian) mit dynamischer UI-Anpassung entsprechend Use-Case.

- Konfigurierbare Anzahl von Aktionen (Armen) und Iterationen.

- Live-Visualisierung von Rewards und Bernoulli-Ergebnissen.

- Tabellarische und grafische Performance-Auswertung im Vergleich zu Standardalgorithmen.

- Standard-Algorithmen: Greedy, Epsilon-Greedy, Optimistic Initial Values, Upper-Confidence-Bound (UCB), Thompson Sampling, Gradient Bandit.

- Responsive & desktop-first UI, performant dank Web-Worker und Comlink.

- Modernes Frontend mit Vue 3 (Composition API) + TypeScript, Pinia für State Management.

- UI Libraries: Naive UI & TailwindCSS.

- Leistungsfähige Charts via Apache ECharts.

- Vollständig lokal, keine Remote-Datenhaltung.

- Umfangreiche Tests: Vitest (Unit/UI), Playwright (E2E).

- CI/CD: Automatisches Prüfen via Pull Requests, automatische Veröffentlichung auf GitHub Pages.

# Begriffserklärungen

## Single Page Application (SPA)

Eine SPA lädt nicht bei jedem Klick die ganze Seite neu, sondern aktualisiert nur die Teile, die sich ändern. Das sorgt für eine schnelle und flüssige Bedienung, ähnlich wie bei einer installierten App auf dem Smartphone oder PC.

## State Management (Pinia)

Die Anwendung benötigt einen „Zustand“, also alle wichtigen Daten, die sie gerade verwendet (zum Beispiel gewählte Einstellungen oder Zwischenergebnisse). Pinia ist das Werkzeug, das dabei hilft, diesen Zustand übersichtlich und sicher zu verwalten, sodass alle Teile der Anwendung immer die gleichen, aktuellen Daten haben.

## Web-Worker & Comlink

Aufwändige Berechnungen, zum Beispiel das Ausführen von Algorithmen, können eine Webseite langsam machen. Web-Worker sind kleine Helferprogramme, die im Hintergrund laufen, sodass die Benutzeroberfläche schnell bleibt. Comlink ermöglicht eine einfache und sichere Kommunikation zwischen der Hauptanwendung und diesen Web-Workern.

## Algorithmen im Tool

Die Algorithmen entscheiden, wie man aus mehreren Möglichkeiten (z.B. verschiedenen Thumbnails) die beste auswählt:

- Greedy: Immer die aktuell beste bekannte Option wählen.

- ε-Greedy (Epsilon-Greedy): Meist die beste Option wählen, aber manchmal auch eine zufällige, um Neues zu entdecken.

- Optimistic Initial Values: Alle Optionen am Anfang sehr positiv bewerten, damit alle mindestens einmal getestet werden.

- Upper Confidence Bound (UCB): Berücksichtigt bisherige Ergebnisse und Unsicherheit, um Optionen gezielt zu untersuchen.

- Thompson Sampling: Nutzt Wahrscheinlichkeiten, um unter Unsicherheit kluge Entscheidungen zu treffen.

- Gradient Bandit: Lernt die Vorlieben über kleine Anpassungen im Laufe der Zeit; besonders geeignet bei kontinuierlichen Belohnungen.

## Exploration vs. Exploitation

- Exploration: Neue oder weniger getestete Optionen ausprobieren, um mehr darüber zu lernen.

- Exploitation: Bewährte, bekannte Optionen wählen, um möglichst viel Gewinn zu erzielen.

Unsere Algorithmen balancieren diese beiden Ziele, um langfristig die beste Auswahl zu treffen.

## CI/CD Pipeline

Continuous Integration (CI) und Continuous Deployment (CD) sind automatisierte Prozesse, die sicherstellen, dass jeder neue Code geprüft, getestet und erst dann in das Hauptprojekt übernommen wird. Nach erfolgreichem Einbau wird die Anwendung automatisch online bereitgestellt. So bleibt die Software stabil und immer aktuell.

## Unit-Tests und End-to-End (E2E) Tests

- Unit-Tests: Prüfen einzelne Funktionen oder Komponenten isoliert.

- End-to-End (E2E) Tests: Prüfen das Zusammenspiel der gesamten Anwendung aus der Sicht eines Nutzers.

## MIT-Lizenz

Die MIT-Lizenz ist eine Open-Source-Softwarelizenz, die es jedem erlaubt, den Code frei zu verwenden, zu verändern und weiterzugeben – auch in eigenen Projekten. Dabei muss ein Hinweis auf die ursprünglichen Urheber und die Lizenz beigefügt werden. Die Lizenz stellt den Code ohne Garantie bereit und die Urheber übernehmen keine Haftung.

# Zielgruppe und Verwendung

Dieses Tool richtet sich vor allem an Studierende, Lehrende und Forschende, die Multi-Armed-Bandit-Algorithmen besser verstehen, ausprobieren und vergleichen möchten – hier im Kontext von YouTube-Thumbnails. Es bietet eine praxisnahe, interaktive Umgebung, um Entscheidungsstrategien unter Unsicherheit zu erforschen.

# Getting Started

## Voraussetzungen

- Node.js (empfohlene Version: aktuelle LTS)

- npm oder yarn

## Installation

bash
git clone https://github.com/LeiffK/Programmierprojekt.git
cd Programmierprojekt
npm install

## Entwicklung starten

bash
npm run dev

Die Anwendung läuft unter: https://leiffk.github.io/Programmierprojekt/

## Produktion-Build

bash
npm run build

Die gebauten Dateien liegen im Ordner dist und werden nach einem Merge automatisch auf GitHub Pages veröffentlicht.

## Projektstruktur

text
/src
/app # Startpunkt der App: App.vue, Router, globale Styles und UI-Theme
/components # Kleine und wiederverwendbare UI-Bausteine (Cards, Tabellen, Charts)
/features # Größere Funktionseinheiten (Konfiguration, Live-Simulation, Analyse, Custom-Algo)
/stores # Pinia-Stores für den globalen Zustand
/domain # Kernlogik: Algorithmen, Umgebungen und Metriken (rein TypeScript)
/workers # Browser Web-Worker mit Comlink-Schnittstelle
/composables # Wiederverwendbare Funktions-Hooks (z. B. Simulation, Charts, Validierung)
/assets # Statische Dateien wie Bilder, Fonts
/tests # Testfälle: Unit, UI und End-to-End Tests

## Nutzung

1. Wähle den Bandit-Typ (Bernoulli oder Gaussian). Die UI passt sich dem Use-Case dynamisch an.

2. Definiere Anzahl der Aktionen (Arme) und Iterationen (Simulationsschritte).

3. Starte manuelles Testen oder mehrere parallele Algorithmen-Simulationen.

4. Neben den Standard-Algorithmen kann im Tool über den Button „Eigener Algorithmus“ ein individueller Algorithmus eingegeben werden. Nach Klick auf diesen Button öffnet sich ein Editor, in dem eigener TypeScript-Code direkt eingegeben werden kann. Der Algorithmus kann so direkt im Vergleich mit den Standard-Strategien getestet und live ausgewertet werden.

5. Beobachte das Live-Feedback in Form von Rewards oder Klick-Ergebnissen.

6. Ergebnisse werden tabellarisch und grafisch mit Standardalgorithmen verglichen.

# Entwicklung & Testing

- Code in Englisch (UI-Texte können Deutsch sein).

- Einheitliche Namenskonventionen für bessere Leserlichkeit.

- Manuelles und automatisiertes Testen:

-- Vitest für Unit- und UI-Tests.

-- Playwright für End-to-End Tests.

- Peer-Reviews vor Mergen sind Pflicht.

# Architekturelle Schwerpunkte

- Rechenintensive Simulationen laufen in Web-Workern im Hintergrund, damit die UI schnell und flüssig bleibt.

- Pinia verwaltet den globalen Zustand übersichtlich.

- Klare Trennung in Features wie Konfiguration, Live-Daten, Analyse und Custom-Algorithmen ermöglicht gute Wartbarkeit und Erweiterbarkeit.

# Continuous Integration & Deployment (CI/CD)

- Alle Code-Änderungen werden automatisch geprüft (Formatierung, Typen, Tests, Build).

- Nur geprüfter Code darf in den Haupt-Branch (main) gemerged werden.

- Nach Merge: automatisches Deployment der App via GitHub Pages.

# Häufige Fragen (FAQ)

## Für wen ist das Tool geeignet?

Für alle, die Multi-Armed-Bandit-Algorithmen verstehen oder selbst testen wollen, besonders Studierende.

## Welche Browser werden unterstützt?

Moderne Browser mit Unterstützung für Web-Worker und ES6+ Features, z.B. Chrome, Firefox, Edge und Safari.

# Weitere Ressourcen

- Figma UI-Mockup

- Jira Board

- Ausführliche Algorithmen- und Kennzahlen-Dokumentationen im Team-Wiki

# Contribution Guidelines

- Feature-Branches vom main aus erstellen.

- Änderungen implementieren und lokal testen.

- Pull Request mit Beschreibung und Tests eröffnen.

- Peer-Review und automatisierte Checks abwarten.

- Nach Freigabe wird der Code in den Haupt-Branch gemerged.

# Lizenz

Dieses Projekt steht unter der MIT-Lizenz.
Diese erlaubt es jedem, den Code frei zu nutzen, zu modifizieren und weiterzugeben, solange der ursprüngliche Lizenzhinweis erhalten bleibt. Eine Garantie für Fehlerfreiheit gibt es nicht.

# Kontakt und Support

Bei Fragen oder Problemen wende Dich bitte an das Projektteam über die Kommunikationskanäle des Kurses.
