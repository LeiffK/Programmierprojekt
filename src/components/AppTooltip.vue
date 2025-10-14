<template>
  <span class="tooltip-wrapper" @mouseenter="show" @mouseleave="hide">
    <slot></slot>
    <span
      v-if="visible"
      class="tooltip-box"
      :class="positionClass"
      role="tooltip"
    >
      {{ text }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

interface Props {
  text: string;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

const props = withDefaults(defineProps<Props>(), {
  position: "top",
  delay: 300,
});

const visible = ref(false);
let timeout: ReturnType<typeof setTimeout> | null = null;

const positionClass = computed(() => `tooltip-${props.position}`);

function show() {
  timeout = setTimeout(() => {
    visible.value = true;
  }, props.delay);
}

function hide() {
  if (timeout) {
    clearTimeout(timeout);
    timeout = null;
  }
  visible.value = false;
}
</script>

<style scoped>
.tooltip-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.tooltip-box {
  position: absolute;
  z-index: 10000;
  padding: 8px 12px;
  background: #1f1f1f;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  color: #e8e8e8;
  font-size: 12px;
  line-height: 1.5;
  white-space: normal;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  animation: tooltipFadeIn 0.15s ease;
  min-width: 200px;
  max-width: 280px;
  word-wrap: break-word;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Position: Top (default) */
.tooltip-top {
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}

.tooltip-top::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #3a3a3a;
}

/* Position: Bottom */
.tooltip-bottom {
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}

.tooltip-bottom::after {
  content: "";
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-bottom-color: #3a3a3a;
}

/* Position: Left */
.tooltip-left {
  right: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
}

.tooltip-left::after {
  content: "";
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  border: 5px solid transparent;
  border-left-color: #3a3a3a;
}

/* Position: Right */
.tooltip-right {
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
}

.tooltip-right::after {
  content: "";
  position: absolute;
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  border: 5px solid transparent;
  border-right-color: #3a3a3a;
}
</style>
