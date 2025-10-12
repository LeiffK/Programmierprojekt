<template>
  <div
    class="thumb"
    role="button"
    tabindex="0"
    :aria-label="`Thumbnail ${label} auswählen`"
    @click="emitPick"
    @keydown.enter.prevent="emitPick"
    @keydown.space.prevent="emitPick"
  >
    <!-- Kopf / Badges -->
    <header class="thumb-head">
      <div class="lh">
        <div class="label">{{ label }}</div>
        <div class="variant muted">{{ variant }}</div>
      </div>
      <div class="n-pill">n={{ n }}</div>
    </header>

    <!-- Medienbereich (flacher) -->
    <div class="thumb-media">
      <slot name="media">
        <div class="media-placeholder" />
      </slot>
    </div>

    <!-- Footer / KPIs -->
    <footer class="thumb-foot">
      <div class="foot-line">
        <span class="cap muted">Schätzung:</span>
        <span class="val"
          ><b>{{ estimate }}</b></span
        >
      </div>

      <!-- Wahr nur im Debug-Modus -->
      <div v-if="debug && truth && truth !== '-'" class="foot-line truth muted">
        <span class="cap">Wahr:</span>
        <span class="val"
          ><b>{{ truth }}</b></span
        >
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string;
  variant: string;
  n: number;
  estimate: string;
  truth?: string;
  /** Debug-Modus: steuert Sichtbarkeit der „Wahr“-Zeile */
  debug?: boolean;
}>();

const emit = defineEmits<{
  (e: "pick"): void;
}>();

function emitPick() {
  emit("pick");
}
</script>

<style scoped>
/* Card-Container – interaktiv, flacher, vollflächig klickbar */
.thumb {
  --media-h: 130px; /* vorher ~180px → „etwas flacher“ */
  background: #191919;
  border: 1px solid #272727;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  user-select: none;
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease,
    transform 40ms ease;
}
.thumb:hover {
  border-color: #2f2f2f;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.04) inset;
}
.thumb:active {
  transform: translateY(1px);
}
.thumb:focus {
  outline: none;
}
.thumb:focus-visible {
  box-shadow: 0 0 0 2px rgba(120, 160, 255, 0.28);
}

/* Kopf */
.thumb-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 6px 12px;
}
.lh .label {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: #111;
  border: 1px solid #222;
  font-size: 12px;
  font-weight: 600;
}
.variant {
  margin-top: 4px;
  font-size: 12px;
}
.n-pill {
  font-size: 12px;
  font-weight: 700;
  color: #a0a0a0;
}

/* Medienbereich – flacher */
.thumb-media {
  height: var(--media-h);
  background: #222;
  display: flex;
  align-items: center;
  justify-content: center;
}
.media-placeholder {
  width: 64px;
  height: 44px;
  border-radius: 12px;
  background: #e53935;
  position: relative;
}
.media-placeholder::after {
  content: "";
  position: absolute;
  left: 26px;
  top: 14px;
  border-style: solid;
  border-width: 8px 0 8px 14px;
  border-color: transparent transparent transparent #fff;
}

/* Footer */
.thumb-foot {
  background: #161616;
  border-top: 1px solid #222;
  padding: 10px 12px;
}
.foot-line {
  display: flex;
  gap: 6px;
  align-items: baseline;
  margin-top: 4px;
}
.cap {
  color: #9aa0a6;
}
.val {
  color: #e5e7eb;
}
.truth {
  margin-top: 2px;
}

/* Muted */
.muted {
  color: #9aa0a6;
}
</style>
