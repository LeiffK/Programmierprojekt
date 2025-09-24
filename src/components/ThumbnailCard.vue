<template>
  <div class="thumb">
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
      <button class="btn primary" @click="$emit('pick')">
        Testen (1 Zuschauer)
      </button>
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
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  overflow: hidden;
  background: #1a1a1a;
}
.art {
  height: 140px;
  display: grid;
  place-items: center;
  background: #242424;
  position: relative;
}
.tag {
  position: absolute;
  top: 10px;
  left: 10px;
  background: #00000025;
  color: #eaeaea;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid #00000040;
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
.btn {
  background: #2b2b2b;
  color: #fff;
  border: 1px solid #3a3a3a;
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
}
.btn.primary {
  background: #ff0000;
  border-color: #ff0000;
}
</style>
