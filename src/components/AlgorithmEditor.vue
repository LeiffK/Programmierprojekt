<template>
  <div class="editor-wrapper">
    <h3 class="editor-title">Eigenen Algorithmus schreiben</h3>
    <!-- Dropdown zum Laden gespeicherter Policies -->
    <div v-if="savedPolicies.length > 0" class="saved-select">
      <label for="saved">Gespeicherte Policies:</label>
      <select id="saved" v-model="selectedPolicy" @change="onSelectPolicy">
        <option disabled value="">Bitte auswählen...</option>
        <option v-for="p in savedPolicies" :key="p.name" :value="p.name">
          {{ p.name }}
        </option>
      </select>
    </div>

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

      <button @click="loadCustomPolicy" class="apply-btn">
        Laden & Verwenden
      </button>
    </div>

    <!-- Status -->
    <div v-if="status" :class="statusClass" class="status-msg">
      {{ status }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { CustomPolicyLoader } from "@/algorithms/CustomPolicyLoader";

const emit = defineEmits(["policyLoaded"]);
const userCode = ref(`import { BasePolicy } from "./BasePolicy";

export class MyPolicy extends BasePolicy {
  selectAction() {
    return Math.floor(this.rng() * this.env.arms.length);
    //Hier muss ich mit den Kommentaren noch erklären wie man einen eigenen Algorithmus implementieren kann
  }
}`);
const lang = ref<"typescript" | "javascript">("typescript");
const status = ref<string | null>(null);
const savedPolicies = ref<{ name: string; code: string; lang: string }[]>([]);
const selectedPolicy = ref<string>("");

const loadCustomPolicy = async () => {
  try {
    const policy = await CustomPolicyLoader.loadPolicy(
      userCode.value,
      lang.value,
    );
    emit("policyLoaded", policy);

    const className = policy.constructor?.name ?? "Unbekannte Policy";
    status.value = `Policy "${className}" erfolgreich geladen!`;
    if (!savedPolicies.value.some((p) => p.name === className)) {
      savedPolicies.value.push({
        name: className,
        code: userCode.value,
        lang: lang.value,
      });
      localStorage.setItem(
        "savedPolicies",
        JSON.stringify(savedPolicies.value),
      );
    }
  } catch (err: any) {
    status.value = `Fehler: ${err.message}`;
  }
};

const onSelectPolicy = () => {
  const found = savedPolicies.value.find(
    (p) => p.name === selectedPolicy.value,
  );
  if (found) {
    userCode.value = found.code;
    lang.value = found.lang as "typescript" | "javascript";
    status.value = `Policy "${found.name}" geladen.`;
  }
};

onMounted(() => {
  const stored = localStorage.getItem("savedPolicies");
  if (stored) savedPolicies.value = JSON.parse(stored);
});

const statusClass = computed(() =>
  status.value?.startsWith("✅") ? "status-ok" : "status-error",
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
  box-sizing: border-box;
  width: 100%;
}

.editor-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
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
  line-height: 1.5;
  padding: 14px;
  resize: vertical;
  box-sizing: border-box;
}

/* Controls */
.control-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

/* Dropdown + Button je 50 % */
.lang-select,
.apply-btn {
  flex: 1;
  height: 44px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid #333;
  transition: all 0.2s ease;
}

/* Dropdown */
.lang-select {
  background: #1a1a1a;
  color: #ddd;
  padding: 0 12px;
}

/* Button */
.apply-btn {
  background: #ff0000;
  color: #fff;
  border: 1px solid #ff0000;
  cursor: pointer;
}
.apply-btn:hover {
  background: #e00000;
}

/* Status-Box */
.status-msg {
  margin-top: 6px;
  padding: 10px;
  border-radius: 8px;
  font-size: 13px;
  text-align: left;
}
.status-ok {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34d399;
}
.status-error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #f87171;
}
</style>
