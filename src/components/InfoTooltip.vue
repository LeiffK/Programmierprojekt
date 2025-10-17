<template>
  <div class="tooltip-wrapper">
    <div class="tooltip-icon" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
    <transition name="fade">
      <div v-if="show" ref="tooltipRef" class="tooltip-content" :class="position" :style="tooltipStyle">
        <slot>{{ text }}</slot>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';

interface Props {
  text?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const props = withDefaults(defineProps<Props>(), {
  text: '',
  position: 'top'
});

const show = ref(false);
const tooltipRef = ref<HTMLElement | null>(null);
const tooltipStyle = ref<Record<string, string>>({});

async function onMouseEnter() {
  show.value = true;
  await nextTick();
  adjustTooltipPosition();
}

function onMouseLeave() {
  show.value = false;
  tooltipStyle.value = {};
}

function adjustTooltipPosition() {
  if (!tooltipRef.value) return;

  const tooltip = tooltipRef.value;
  const rect = tooltip.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const padding = 16; // Mindestabstand zum Rand

  const adjustments: Record<string, string> = {};

  // Rechter Rand überschritten
  if (rect.right > viewportWidth - padding) {
    adjustments.left = 'auto';
    adjustments.right = '0';
    adjustments.transform = 'none';
  }

  // Linker Rand überschritten
  if (rect.left < padding) {
    adjustments.left = '0';
    adjustments.right = 'auto';
    adjustments.transform = 'none';
  }

  // Unterer Rand überschritten
  if (rect.bottom > viewportHeight - padding) {
    adjustments.top = 'auto';
    adjustments.bottom = 'calc(100% + 12px)';
  }

  // Oberer Rand überschritten
  if (rect.top < padding) {
    adjustments.bottom = 'auto';
    adjustments.top = 'calc(100% + 12px)';
  }

  tooltipStyle.value = adjustments;
}
</script>

<style scoped>
.tooltip-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 10px;
}

.tooltip-icon {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: help;
  color: #9aa0a6;
  border: 1.5px solid #4a4a4a;
  border-radius: 50%;
  background: #1a1a1a;
  transition: all 0.2s ease;
}

.tooltip-icon:hover {
  color: #e0e0e0;
  border-color: #6a6a6a;
  background: #252525;
  transform: scale(1.15);
}

.tooltip-icon svg {
  width: 13px;
  height: 13px;
}

.tooltip-content {
  position: absolute;
  z-index: 1000;
  padding: 12px 16px;
  background: linear-gradient(135deg, #2d2d2d 0%, #262626 100%);
  border: 1px solid #555;
  border-radius: 10px;
  color: #f0f0f0;
  font-size: 14px;
  line-height: 1.5;
  white-space: normal;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  max-width: 380px;
  min-width: 240px;
  font-weight: 500;
}

.tooltip-content.top {
  bottom: calc(100% + 12px);
  left: -6px;
  transform: translateX(0);
}

.tooltip-content.bottom {
  top: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
}

.tooltip-content.left {
  right: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
}

.tooltip-content.right {
  left: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
}

/* Arrow */
.tooltip-content::before {
  content: '';
  position: absolute;
  width: 0;
  height: 0;
  border: 6px solid transparent;
}

.tooltip-content.top::before {
  top: 100%;
  left: 16px;
  transform: translateX(0);
  border-top-color: #4a4a4a;
}

.tooltip-content.bottom::before {
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-bottom-color: #4a4a4a;
}

.tooltip-content.left::before {
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  border-left-color: #4a4a4a;
}

.tooltip-content.right::before {
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  border-right-color: #4a4a4a;
}

/* Fade animation */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
