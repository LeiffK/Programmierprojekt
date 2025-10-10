<template>
  <div class="editor-wrapper" ref="editorRoot">
    <h3 class="editor-title">Eigenen Algorithmus schreiben</h3>

    <!-- Codefeld -->
    <textarea
      v-model="userCode"
      class="code-box"
      spellcheck="false"
      placeholder="// Schreibe hier deinen Algorithmus..."
    ></textarea>

    <!-- Controls -->
    <div class="control-row">
      <select v-model="lang" class="lang-select">
        <option value="typescript">TypeScript</option>
        <option value="javascript">JavaScript</option>
      </select>

      <button @click="saveCustomPolicy" class="save-btn">Speichern</button>
      <button @click="newCustomPolicy" class="neutral-btn">Neu</button>
    </div>

    <!-- Status -->
    <div v-if="status" :class="statusClass" class="status-msg">{{ status }}</div>

    <!-- Liste der gespeicherten Algorithmen -->
    <div v-if="savedPolicies.length > 0" class="policy-list" ref="policyList">
      <div class="variants-head">
        <div class="title">Gespeicherte eigene Algorithmen</div>
      </div>

      <div class="variants-table">
        <div class="variants-row variants-row--head">
          <div class="cell">Bezeichnung</div>
          <div class="cell">Sprache</div>
          <div class="cell cell--end"></div>
        </div>

        <div
          class="variants-row"
          v-for="(p, i) in savedPolicies"
          :key="p.name"
          :class="{
            'is-alt': i % 2 === 1,
            'row-selected': selectedPolicy === p.name
          }"
          @click="showCode(p)"
        >
          <div class="cell">{{ p.name }}</div>
          <div class="cell">{{ p.lang }}</div>
          <div class="cell cell--end">
            <button
              class="btn btn-pill btn-sm"
              :class="{ activeBtn: activePolicies.has(p.name) }"
              @click.stop="togglePolicy(p)"
            >
              {{ activePolicies.has(p.name) ? "In Anwendung" : "Anwenden" }}
            </button>
            <button class="btn btn-ghost btn-sm" @click.stop="removeSaved(p.name)">
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
const lang = ref<"typescript" | "javascript">("typescript");
const status = ref<string | null>(null);
const savedPolicies = ref<{ name: string; code: string; lang: string }[]>([]);
const activePolicies = ref<Set<string>>(new Set());
const selectedPolicy = ref<string | null>(null);

/* --- Speichern --- */
function saveCustomPolicy() {
  try {
    const classNameMatch = userCode.value.match(/class\s+([A-Za-z0-9_]+)/);
    const className = classNameMatch ? classNameMatch[1] : "UnbekanntePolicy";

    const existing = savedPolicies.value.find((p) => p.name === className);
    if (existing) {
      existing.code = userCode.value;
      existing.lang = lang.value;
    } else {
      savedPolicies.value.push({
        name: className,
        code: userCode.value,
        lang: lang.value,
      });
    }

    localStorage.setItem("savedPolicies", JSON.stringify(savedPolicies.value));
    status.value = `💾 Policy "${className}" gespeichert.`;
  } catch (err: any) {
    status.value = `❌ Fehler beim Speichern: ${err.message}`;
  }
}

/* --- Aktivieren/Deaktivieren --- */
async function togglePolicy(p: { name: string; code: string; lang: string }) {
  try {
    if (activePolicies.value.has(p.name)) {
      activePolicies.value.delete(p.name);
      status.value = `⚙️ Policy "${p.name}" deaktiviert.`;
      emit("policyRemoved", { name: p.name });
    } else {
      const policy = await CustomPolicyLoader.loadPolicy(
        p.code,
        p.lang as "typescript" | "javascript"
      );
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
function showCode(p: { name: string; code: string; lang: string }) {
  userCode.value = p.code;
  lang.value = p.lang as "typescript" | "javascript";
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
 * - Passe den Klassennamen an – er erscheint im UI.
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
  if (stored) savedPolicies.value = JSON.parse(stored);
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
.lang-select,
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
.lang-select {
  background: #1a1a1a;
  color: #ddd;
  padding: 0 12px;
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
  grid-template-columns: 2fr 1fr 1fr;
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
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid #333;
  background: #222;
  color: #eee;
  transition: all 0.2s ease;
}
.btn:hover {
  background: #333;
}
.btn-sm {
  font-size: 13px;
  height: 28px;
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


