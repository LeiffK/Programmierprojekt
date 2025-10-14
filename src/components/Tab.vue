<template>
  <div class="tabs-container">
    <ul class="tab-header">
      <li 
        v-for="(tab, index) in tabs" 
        :key="tab.key" 
        :class="{ active: selectedIndex === index }"
        @click="selectTab(index)"
      >
        <i :class="tab.iconClass" aria-hidden="true"></i>
        {{ tab.label }}
      </li>
    </ul>

    <div class="tab-content">
      <component :is="tabs[selectedIndex].component" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

// Beispiel-Komponenten für die Tab-Inhalte importieren
import ThumbnailComparison from "./ThumbnailComparison.vue";
import CustomAlgorithmEditor from "./CustomAlgorithmEditor.vue";
import AnalysisDashboard from "./AnalysisDashboard.vue";

const tabs = [
  { key: "comparison", label: "Thumbnail Vergleich", iconClass: "icon-compare", component: ThumbnailComparison },
  { key: "customAlgo", label: "Eigener Algorithmus", iconClass: "icon-code", component: CustomAlgorithmEditor },
  { key: "analysis", label: "Analyse & Performance", iconClass: "icon-chart", component: AnalysisDashboard },
];

const selectedIndex = ref(0);

function selectTab(index: number) {
  selectedIndex.value = index;
}
</script>

<style scoped>
.tabs-container {
  width: 100%;
}

.tab-header {
  display: flex;
  list-style: none;
  padding: 0;
  border-bottom: 2px solid #333;
  margin-bottom: 1rem;
  user-select: none;
}

.tab-header li {
  cursor: pointer;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #aaa;
  border-bottom: 3px solid transparent;
  transition: all 0.2s ease;
}

.tab-header li.active {
  color: #ff0000; /* passend zu eurem Design */
  border-bottom-color: #ff0000;
  font-weight: bold;
}

.tab-header li:hover {
  color: #ff5555;
}

.tab-content {
  padding: 1rem 0;
}

/* Beispiel-Icon Klassen, je nach verwendetem Icon-Set ersetzen */
.icon-compare::before {
  content: "🔍";
}
.icon-code::before {
  content: "💻";
}
.icon-chart::before {
  content: "📊";
}
</style>
