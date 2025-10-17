<template>
  <div class="editor-wrapper" ref="editorRoot">
    <h3 class="editor-title">Eigenen Algorithmus schreiben</h3>

    <!-- Ausklappbare Anleitung -->
    <details class="help-section" :open="helpOpen">
      <summary @click="toggleHelp">
        <div class="help-header">
          <svg class="help-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span class="help-title">Anleitung: Wie schreibe ich einen eigenen Algorithmus?</span>
          <span class="help-chevron" :class="{ open: helpOpen }">▾</span>
        </div>
      </summary>
      <div class="help-content">
        <h4>Grundlagen</h4>
        <ul>
          <li><strong>Sprache:</strong> TypeScript (ES2022)</li>
          <li><strong>Klassenname:</strong> Benenne deine Klasse eindeutig (z.B. <code>MyPolicy</code>) – dieser Name erscheint im UI</li>
          <li><strong>Basisklasse:</strong> Deine Klasse muss von <code>BasePolicy</code> erben</li>
        </ul>

        <h4>Verfügbare Funktionen aus BasePolicy</h4>
        <table class="help-table">
          <tbody>
            <tr>
              <td><code>this.nArms</code></td>
              <td>Anzahl der verfügbaren Arme</td>
            </tr>
            <tr>
              <td><code>this.rng()</code></td>
              <td>Gibt eine Zufallszahl zwischen 0 und 1 zurück</td>
            </tr>
            <tr>
              <td><code>this.randomArm()</code></td>
              <td>Gibt einen zufälligen Armindex zurück</td>
            </tr>
            <tr>
              <td><code>this.getEstimates()</code></td>
              <td>Array mit aktuellen Schätzungen für jeden Arm</td>
            </tr>
            <tr>
              <td><code>this.getCounts()</code></td>
              <td>Array mit Anzahl der Ziehungen pro Arm</td>
            </tr>
          </tbody>
        </table>

        <h4>Wichtige Hinweise</h4>
        <ul>
          <li>Die Methode <code>selectAction()</code> muss einen gültigen Arm-Index (0 bis nArms-1) zurückgeben</li>
          <li>Wirft <code>selectAction()</code> einen Fehler, wird die Policy deaktiviert</li>
          <li>Nach dem Speichern kannst du deine Policy über den "Anwenden"-Button aktivieren</li>
          <li>Aktivierte Policies erscheinen in den Verläufen und der Vergleichstabelle</li>
        </ul>

        <h4>Beispiel: Epsilon-Greedy</h4>
        <pre class="help-code">export class MyEpsilonGreedy extends BasePolicy {
  epsilon = 0.1;

  selectAction() {
    if (this.rng() < this.epsilon) {
      return this.randomArm();  // Exploration
    }
    // Exploitation: Wähle besten Arm
    const estimates = this.getEstimates();
    return estimates.indexOf(Math.max(...estimates));
  }
}</pre>
      </div>
    </details>

    <!-- Codefeld -->
    <textarea
      v-model="userCode"
      class="code-box"
      spellcheck="false"
      placeholder="// Schreibe hier deinen Algorithmus..."
    ></textarea>

    <!-- Controls -->
    <div class="control-row">
      <button @click="saveCustomPolicy" class="save-btn">Speichern</button>
      <button @click="newCustomPolicy" class="neutral-btn">Neu</button>
    </div>

    <!-- Status -->
    <div v-if="status" :class="statusClass" class="status-msg">
      {{ status }}
    </div>

    <!-- Liste der gespeicherten Algorithmen -->
    <div v-if="savedPolicies.length > 0" class="policy-list" ref="policyList">
      <div class="variants-head">
        <div class="title">Gespeicherte eigene Algorithmen</div>
      </div>

      <div class="variants-table">
        <div class="variants-row variants-row--head">
          <div class="cell">Bezeichnung</div>
          <div class="cell cell--end"></div>
        </div>

        <div
          class="variants-row"
          v-for="(p, i) in savedPolicies"
          :key="p.name"
          :class="{
            'is-alt': i % 2 === 1,
            'row-selected': selectedPolicy === p.name,
          }"
          @click="showCode(p)"
        >
          <div class="cell">{{ p.name }}</div>
          <div class="cell cell--end">
            <button
              class="btn btn-pill btn-sm"
              :class="{ activeBtn: activePolicies.has(p.name) }"
              @click.stop="togglePolicy(p)"
            >
              {{ activePolicies.has(p.name) ? "In Anwendung" : "Anwenden" }}
            </button>
            <button
              class="btn btn-ghost btn-sm"
              @click.stop="removeSaved(p.name)"
            >
              Löschen
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { CustomPolicyLoader } from "../algorithms/CustomPolicyLoader.ts";
import type { iBanditPolicy } from "../algorithms/Domain/iBanditPolicy";

interface SavedPolicy {
  name: string;
  code: string;
}

const emit = defineEmits<{
  (
    e: "policyLoaded",
    payload: { name: string; policyCtor: new () => iBanditPolicy },
  ): void;
  (e: "policyRemoved", payload: { name: string }): void;
}>();

const userCode = ref(`import { BasePolicy } from "./BasePolicy";

/**
 * Quickstart:
 * - Sprache: TypeScript (ES2022).
 * - Benenne die Klasse (z.B. MyPolicy); der Name erscheint im UI.
 * - Aus BasePolicy (Die Elternklasse) stehen dir folgende Funktionen bereit:
 *     this.nArms           // Anzahl der Arme
 *     this.rng()           // Zufallszahl 0..1
 *     this.randomArm()     // zufälligen Armindex
 *     this.getEstimates()  // aktuelle Schätzungen je Arm
 *     this.getCounts()     // Ziehungen je Arm

Wirft selectAction() einen Fehler, wird die Policy gestoppt und taucht nicht in Tabelle/Graph auf.
 */
export class MyPolicy extends BasePolicy {
  selectAction() {
    // TODO: ersetze die Logik durch deinen Algorithmus
    return this.randomArm();
  }
}
`);
const status = ref<string | null>(null);
const savedPolicies = ref<SavedPolicy[]>([]);
const activePolicies = ref<Set<string>>(new Set());
const selectedPolicy = ref<string | null>(null);
const helpOpen = ref<boolean>(false);

function toggleHelp(e: Event) {
  e.preventDefault();
  helpOpen.value = !helpOpen.value;
}

/* --- Speichern --- */
function saveCustomPolicy() {
  try {
    const classNameMatch = userCode.value.match(/class\s+([A-Za-z0-9_]+)/);
    const className = classNameMatch ? classNameMatch[1] : "UnbekanntePolicy";

    const existing = savedPolicies.value.find((p) => p.name === className);
    if (existing) {
      existing.code = userCode.value;
    } else {
      savedPolicies.value.push({
        name: className,
        code: userCode.value,
      });
    }

    localStorage.setItem("savedPolicies", JSON.stringify(savedPolicies.value));
    status.value = `💾 Policy "${className}" gespeichert.`;
  } catch (err: any) {
    status.value = `❌ Fehler beim Speichern: ${err.message}`;
  }
}

/* --- Aktivieren/Deaktivieren --- */
async function togglePolicy(p: SavedPolicy) {
  try {
    if (activePolicies.value.has(p.name)) {
      activePolicies.value.delete(p.name);
      status.value = `⚙️ Policy "${p.name}" deaktiviert.`;
      emit("policyRemoved", { name: p.name });
    } else {
      const policy = await CustomPolicyLoader.loadPolicy(p.code);
      const ctor = policy?.constructor as new () => iBanditPolicy;
      if (typeof ctor !== "function") {
        throw new Error("Policy besitzt keinen Konstruktor.");
      }
      emit("policyLoaded", { name: p.name, policyCtor: ctor });
      activePolicies.value.add(p.name);
      status.value = `✅ Policy "${p.name}" aktiviert.`;
    }
  } catch (err: any) {
    status.value = `❌ Fehler: ${err.message}`;
  }
}
/* --- Code anzeigen bei Klick --- */
function showCode(p: SavedPolicy) {
  userCode.value = p.code;
  selectedPolicy.value = p.name;
}

/* --- Entfernen --- */
function removeSaved(name: string) {
  savedPolicies.value = savedPolicies.value.filter((p) => p.name !== name);
  activePolicies.value.delete(name);
  localStorage.setItem("savedPolicies", JSON.stringify(savedPolicies.value));
  if (selectedPolicy.value === name) selectedPolicy.value = null;
}

/* --- Neuer Algorithmus --- */
function newCustomPolicy() {
  userCode.value = `import { BasePolicy } from "./BasePolicy";

/**
 * Hinweise:
 * - Sprache: TypeScript (ES2022).
 * - Passe den Klassennamen an - er erscheint im UI.
 * - Nutzbare Helfer aus BasePolicy:
 *     this.nArms, this.rng(), this.randomArm(),
 *     this.getEstimates(), this.getCounts().
 * - selectAction() darf keine Fehler werfen, sonst erscheint er nicht unter "Verlauf" und "Vergleich & Kennzahlen"
 */
export class NeuePolicy extends BasePolicy {
  selectAction() {
    return this.randomArm();
  }
}

`;
  selectedPolicy.value = null;
  status.value = "✏️ Neuer Algorithmus vorbereitet.";
}

/* --- Laden beim Start --- */
onMounted(() => {
  const stored = localStorage.getItem("savedPolicies");
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Array<{
        name: string;
        code: string;
        lang?: string;
      }>;
      savedPolicies.value = parsed.map((p) => ({
        name: p.name,
        code: p.code,
      }));
      localStorage.setItem(
        "savedPolicies",
        JSON.stringify(savedPolicies.value),
      );
    } catch {
      savedPolicies.value = [];
    }
  }
});

const statusClass = computed(() =>
  status.value?.startsWith("✅") ||
  status.value?.startsWith("💾") ||
  status.value?.startsWith("⚙️")
    ? "status-ok"
    : "status-error",
);
</script>

<style scoped>
.editor-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  padding: 20px;
  color: #fff;
  width: 100%;
  box-sizing: border-box;
}

/* Help Section */
.help-section {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 16px;
}

.help-section summary {
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.help-section summary::-webkit-details-marker {
  display: none;
}

.help-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #1f1f1f;
  transition: background 0.2s ease;
}

.help-section summary:hover .help-header {
  background: #252525;
}

.help-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: #4fc3f7;
}

.help-title {
  flex: 1;
  font-weight: 600;
  font-size: 15px;
}

.help-chevron {
  transition: transform 0.2s ease;
  font-size: 16px;
  color: #999;
}

.help-chevron.open {
  transform: rotate(180deg);
}

.help-content {
  padding: 20px;
  background: #161616;
  border-top: 1px solid #2a2a2a;
  line-height: 1.6;
}

.help-content h4 {
  margin: 20px 0 12px 0;
  color: #e0e0e0;
  font-size: 15px;
  font-weight: 700;
}

.help-content h4:first-child {
  margin-top: 0;
}

.help-content ul {
  margin: 8px 0;
  padding-left: 24px;
}

.help-content li {
  margin: 6px 0;
  color: #ccc;
}

.help-content code {
  background: #0e0e0e;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 2px 6px;
  font-family: "Fira Code", monospace;
  font-size: 13px;
  color: #4fc3f7;
}

.help-table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}

.help-table tr {
  border-bottom: 1px solid #2a2a2a;
}

.help-table td {
  padding: 10px 12px;
  color: #ccc;
}

.help-table td:first-child {
  font-family: "Fira Code", monospace;
  color: #4fc3f7;
  width: 200px;
}

.help-code {
  background: #0e0e0e;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 14px;
  font-family: "Fira Code", monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #eaeaea;
  overflow-x: auto;
  margin: 12px 0;
}

/* Codefeld */
.code-box {
  width: 100%;
  min-height: 220px;
  background: #0e0e0e;
  color: #eaeaea;
  border: 1px solid #333;
  border-radius: 10px;
  font-family: "Fira Code", monospace;
  font-size: 14px;
  padding: 14px;
  resize: vertical;
  box-sizing: border-box;
}

/* Controls */
.control-row {
  display: flex;
  gap: 8px;
}
.save-btn,
.neutral-btn {
  flex: 1;
  height: 42px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid #333;
  cursor: pointer;
}
.save-btn {
  background: #ff0000;
  color: #fff;
}
.save-btn:hover {
  background: #d40000;
}
.neutral-btn {
  background: #1a1a1a;
  color: #fff;
}
.neutral-btn:hover {
  background: #2a2a2a;
}

/* Tabelle */
.policy-list {
  margin-top: 10px;
}
.variants-table {
  border: 1px solid #333;
  border-radius: 10px;
  overflow: hidden;
}
.variants-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  border-top: 1px solid #2a2a2a;
  background: #181818;
  cursor: pointer;
  transition: background 0.25s ease;
}
.variants-row.is-alt {
  background: #101010;
}
.variants-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

/* ✨ Dauerhaft sichtbarer Highlight */
.row-selected {
  background: rgba(255, 255, 255, 0.05) !important;
}

/* Zellen */
.cell {
  padding: 10px;
}
.cell--end {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

/* Buttons */
.btn {
  height: 28px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #333;
  background: #222;
  color: #eee;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}
.btn:hover {
  background: #333;
}
.btn-sm {
  font-size: 13px;
  height: 28px;
}
.btn-pill {
  min-width: 116px;
}

/* Aktivierte Buttons */
.activeBtn {
  background: #ff0000 !important;
  border-color: #ff0000 !important;
  color: #fff !important;
}

/* Status */
.status-ok {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34d399;
  border-radius: 8px;
  padding: 8px;
}
.status-error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #f87171;
  border-radius: 8px;
  padding: 8px;
}
</style>
