<template>
  <div class="tooltip-wrapper">
    <div class="tooltip-icon" @mouseenter="show = true" @mouseleave="show = false">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
    <transition name="fade">
      <div v-if="show" class="tooltip-content" :class="position">
        <slot>{{ text }}</slot>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  text?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const props = withDefaults(defineProps<Props>(), {
  text: '',
  position: 'top'
});

const show = ref(false);
</script>

<style scoped>
.tooltip-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tooltip-icon {
  width: 18px;
  height: 18px;
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
  transform: scale(1.1);
}

.tooltip-icon svg {
  width: 12px;
  height: 12px;
}

.tooltip-content {
  position: absolute;
  z-index: 1000;
  padding: 8px 12px;
  background: #2a2a2a;
  border: 1px solid #4a4a4a;
  border-radius: 8px;
  color: #e5e5e5;
  font-size: 13px;
  line-height: 1.4;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.tooltip-content.top {
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}

.tooltip-content.bottom {
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}

.tooltip-content.left {
  right: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
}

.tooltip-content.right {
  left: calc(100% + 8px);
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
  left: 50%;
  transform: translateX(-50%);
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
