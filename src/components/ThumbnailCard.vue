<template>
  <!-- Die ganze Karte ist jetzt klick- & fokussierbar -->
  <div
    class="thumb clickable"
    role="button"
    tabindex="0"
    :aria-label="`Thumbnail ${label}: ${variant}. Klicken, um 1 Zuschauer zu testen`"
    @click="$emit('pick')"
    @keydown.enter.prevent="$emit('pick')"
    @keydown.space.prevent="$emit('pick')"
  >
    <div class="art">
      <div class="tag">{{ label }}</div>
      <svg viewBox="0 0 80 56" width="56" height="56" aria-hidden="true">
        <rect
          x="6"
          y="8"
          rx="10"
          ry="10"
          width="68"
          height="40"
          fill="#ff0000"
        />
        <polygon points="35,20 35,36 50,28" fill="#fff" />
      </svg>
    </div>

    <div class="meta">
      <div class="row">
        <b>{{ variant }}</b>
        <span class="muted">n={{ n }}</span>
      </div>
      <div class="muted">
        Schätzung: <b>{{ estimate }}</b>
      </div>
      <div class="muted small" v-if="truth">
        Wahr: <b>{{ truth }}</b>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  variant: string;
  n: number;
  estimate: string;
  truth?: string;
}>();

defineEmits<{ (e: "pick"): void }>();
</script>

<style scoped>
.thumb {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--card-2);
  /* sanfter hover/press schon global in motion.css hinterlegt,
     hier nur noch der Fokus-Ring */
  transition:
    transform var(--dur-soft) var(--ease-soft),
    box-shadow var(--dur-soft) var(--ease-soft),
    border-color var(--dur-soft) var(--ease-soft);
}
.thumb:hover {
  transform: translateY(-2px) scale(1.01);
  box-shadow: var(--shadow-1);
}
.thumb:active {
  transform: translateY(0) scale(0.995);
}

.thumb.clickable {
  cursor: pointer;
}
.thumb:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.14),
    0 0 0 5px rgba(255, 0, 0, 0.35);
}

.art {
  height: 140px;
  display: grid;
  place-items: center;
  background: #232323;
  position: relative;
  transition: filter var(--dur-soft) var(--ease-soft);
}
.thumb:hover .art {
  filter: saturate(1.08);
}

.tag {
  position: absolute;
  top: 10px;
  left: 10px;
  background: #00000030;
  color: #eaeaea;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid #00000045;
}

.meta {
  padding: 12px;
  display: grid;
  gap: 6px;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.muted {
  color: #9aa0a6;
}
.muted.small {
  font-size: 12px;
}
</style>
