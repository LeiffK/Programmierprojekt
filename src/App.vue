<template>
  <div class="shell">
    <header class="bar">
      <div class="bar-inner">
        <div class="brand" @click="scrollTop" title="Bandit-Studio">
          <!-- YouTube-├ñhnliches Logo -->
          <svg
            class="yt-logo"
            viewBox="0 0 90 64"
            aria-hidden="true"
            focusable="false"
          >
            <rect x="0" y="0" width="90" height="64" rx="12" ry="12"></rect>
            <polygon points="36,16 36,48 64,32"></polygon>
          </svg>
          <span>Bandit-Studio</span>
        </div>
        <div class="bar-actions">
          <!-- Reset-Button: ├Âffnet In-App-Dialog -->
          <button
            class="btn btn-ghost btn-pill"
            type="button"
            @click="openResetModal"
            title="Alle Einstellungen & Daten zur├╝cksetzen"
            aria-label="Alle Einstellungen und lokal gespeicherten Daten zur├╝cksetzen"
            ref="resetBtnRef"
          >
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 5V2L7 6l5 4V7a5 5 0 1 1-4.9 6.1 1 1 0 0 0-1.96.4A7 7 0 1 0 12 5z"
                fill="currentColor"
              />
            </svg>
            Zur├╝cksetzen
          </button>

          <!-- Debug-Schalter -->
          <button
            class="btn btn-pill"
            :class="debugEnabled ? 'btn-primary' : 'btn-ghost'"
            type="button"
            :aria-pressed="debugEnabled ? 'true' : 'false'"
            @click="toggleDebug"
            title="Debug-Modus ein/aus"
          >
            {{ debugEnabled ? "Debug: an" : "Debug: aus" }}
          </button>

          <button
            class="btn btn-ghost btn-pill"
            @click="showTopic = true"
            title="Thema verstehen"
          >
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm0 15a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm1-4.75h-2V7h2v5.25z"
                fill="currentColor"
              />
            </svg>
            Thema verstehen
          </button>

          <button
            id="btn-tutorial"
            class="btn btn-primary btn-pill"
            @click="startTutorial"
            title="Anwendung verstehen"
          >
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
            Anwendung verstehen
          </button>
        </div>
      </div>
    </header>

    <main class="wrap">
      <div class="page-grid">
        <div class="col-left">
          <div id="env-setup">
            <EnvSetup
              v-model="form"
              :busy="busy"
              @inited="onInited"
              @log="onEnvLog"
            >
              <template #actions>
                <ModeSwitch
                  id="mode-switch"
                  v-model="mode"
                  @change="onModeChange"
                />
              </template>
            </EnvSetup>
          </div>

          <section id="manual-section" class="card" v-if="mode === 'manual'">
            <h2>W├ñhle, welches Thumbnail am besten performen wird <InfoTooltip text="Hier testest du manuell: Klicke auf ein Thumbnail und sieh sofort, wie viel Reward es bringt. Gleichzeitig lernen die Algorithmen im Hintergrund mit ÔÇô so kannst du deine eigene Intuition direkt mit den automatischen Strategien vergleichen." /></h2>

            <div class="thumb-grid">
              <ThumbnailCard
                v-for="i in form.arms"
                :key="i"
                :label="`Thumbnail ${String.fromCharCode(64 + i)}`"
                :variant="`Variante ${String.fromCharCode(64 + i)}`"
                :n="manualCounts[i - 1] || 0"
                :estimate="estimateText(i - 1)"
                :truth="truthText(i - 1)"
                :debug="debugEnabled"
                @pick="onManual(i - 1)"
              />
            </div>

            <div class="toast">
              <div class="pill">Letztes Ereignis</div>
              <div>{{ lastEventText }}</div>
            </div>
          </section>

          <div id="runner-controls" v-else>
            <RunnerControls
              :env-config="form"
              :policy-configs="policyConfigs"
              @reset="onRunnerReset"
            />
          </div>

          <div id="advanced-settings">
            <AdvancedSettings
              :mode="mode"
              v-model:env="form"
              v-model:policyConfigs="policyConfigs"
              v-model:open="settingsOpen"
            />
          </div>
        </div>

        <div class="col-right">
          <section id="chart-area" class="card">
            <h2>Verl├ñufe <InfoTooltip text="Sieh live, wie sich die Algorithmen entwickeln. W├ñhle oben eine Metrik aus (z.B. Gesamt-Reward oder Regret) und klicke in der Legende auf Algorithmen, um einzelne Linien ein- oder auszublenden. So erkennst du schnell, welche Strategie am besten funktioniert." /></h2>
            <ChartArea
              :key="chartKey"
              :series="chartSeries"
              :env-type="form.type"
              v-model="chartMetric"
              @toggle="onChartToggle"
            />
          </section>

          <ComparisonTable
            id="comparison-table"
            class="card"
            :rows="metricRows"
            :visibleMap="visibleMap"
            v-model:open="tableOpen"
            @toggleSeries="onToggleSeries"
          />

          <div id="debug-panel">
            <DebugPanel v-if="debugEnabled" />
          </div>
        </div>
      </div>
    </main>

    <TopicUnderstanding
      :open="showTopic"
      :html="topicHtml"
      @close="showTopic = false"
    />
    <AppTutorial
      :open="showTutorial"
      :hooks="tutorialHooks"
      @close="showTutorial = false"
    />
    <ResetDialog
      :open="showReset"
      @close="closeResetModal"
      @confirm="confirmReset"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

import EnvSetup from "./components/EnvSetup.vue";
import AdvancedSettings from "./components/AdvancedSettings.vue";
import DebugPanel from "./components/DebugPanel.vue";
import ThumbnailCard from "./components/ThumbnailCard.vue";
import RunnerControls from "./components/RunnerControls.vue";
import ModeSwitch from "./components/ModeSwitch.vue";
import ChartArea from "./components/ChartArea.vue";
import ComparisonTable from "./components/ComparisonTable.vue";
import TopicUnderstanding from "./components/TopicUnderstanding.vue";
import AppTutorial from "./components/AppTutorial.vue";
import InfoTooltip from "./components/InfoTooltip.vue";
import ResetDialog from "./components/ResetDialog.vue";

import { topicHtml } from "./content/topicContent";
import "./App.css";

import { useTutorialHooks } from "./composables/useTutorialHooks";
import { useDebugSettings } from "./composables/useDebugSettings";
import { useResetWorkflow } from "./composables/useResetWorkflow";
import { useManualPlayground } from "./composables/useManualPlayground";
import { usePolicyConfigs } from "./composables/usePolicyConfigs";
import { useRunnerOrchestration } from "./composables/useRunnerOrchestration";

import type { iEnvConfig } from "./env/Domain/iEnvConfig";
import { algorithmsRunner } from "./services/algorithmsRunner";
import { attachRunner } from "./services/debugStore";

const form = ref<iEnvConfig>({
  type: "gaussian",
  arms: 3,
  seed: Math.floor(Math.random() * 1_000_000),
});
const lastEventText = ref("-");
const mode = ref<"manual" | "algo">("manual");
const tableOpen = ref(false);
const settingsOpen = ref(false);

const { debugEnabled, toggleDebug } = useDebugSettings();
const {
  showReset,
  resetBtnRef,
  openResetModal,
  closeResetModal,
  confirmReset,
} = useResetWorkflow();

const {
  manualEnv,
  manualHistory,
  manualCounts,
  busy,
  initManualEnv,
  handleManualPick: onManual,
  onEnvLog,
  estimateText,
  truthText,
} = useManualPlayground({ form, debugEnabled, lastEventText });

const { policyConfigs } = usePolicyConfigs(form);

const {
  chartMetric,
  chartKey,
  visibleMap,
  metricRows,
  chartSeries,
  hardResetForMode,
  onRunnerReset,
  onModeChange,
  onInited,
  onToggleSeries,
  onChartToggle,
} = useRunnerOrchestration({
  form,
  mode,
  policyConfigs,
  manualEnv,
  manualHistory,
  manualCounts,
  lastEventText,
  debugEnabled,
  initManualEnv,
});

const showTopic = ref(false);
const showTutorial = ref(false);

function startTutorial() {
  showTutorial.value = true;
}

const tutorialHooks = useTutorialHooks({
  mode,
  onModeChange,
  onRunnerReset,
  form,
  settingsOpen,
  tableOpen,
  onManual,
  chartMetric,
});

function scrollTop() {
  try {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch {
    window.scrollTo(0, 0);
  }
}

onMounted(() => {
  try {
    if (typeof document !== "undefined") {
      document.title = "Bandit-Studio";
    }
  } catch {}
  attachRunner(algorithmsRunner);
  hardResetForMode(mode.value, "bootstrap");
});
</script>
