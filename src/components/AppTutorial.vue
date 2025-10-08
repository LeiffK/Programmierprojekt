<template>
  <teleport to="body">
    <div v-if="openLocal" class="tour-root" role="dialog" aria-modal="true">
      <!-- Vollflächige Sperre: blockiert alle Klicks außerhalb des Tutorials -->
      <div class="tour-dim"></div>

      <!-- Spotlight -->
      <div
        v-if="ring.visible"
        class="focus-ring"
        :style="{
          top: ring.y + 'px',
          left: ring.x + 'px',
          width: ring.w + 'px',
          height: ring.h + 'px',
        }"
      />

      <!-- Ghost Cursor -->
      <div class="ghost-cursor" :style="cursorStyle"></div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import Shepherd from "shepherd.js";

/** Hooks vom Host: echte Aktionen ausführen */
type TutorialHooks = {
  resetBaseline: () => void | Promise<void>;
  restoreBaseline: () => void | Promise<void>;
  incArms: () => void | Promise<void>;
  decArms: () => void | Promise<void>;
  switchToManual: () => void | Promise<void>;
  switchToAlgo: () => void | Promise<void>;
  manualClick: (index: number) => void | Promise<void>;
  runnerStart: () => void | Promise<void>;
  runnerPause: () => void | Promise<void>;
  setMetric: (metric: string) => void | Promise<void>;
  toggleSeries: (id: string, visible: boolean) => void | Promise<void>;
  openTable: () => void | Promise<void>;
  closeTable: () => void | Promise<void>;
};

const props = defineProps<{ open: boolean; hooks: TutorialHooks }>();
const emit = defineEmits<{ (e: "close"): void }>();

/* UI-Block state */
const openLocal = ref(false);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* Cursor */
const curX = ref(-9999),
  curY = ref(-9999),
  curVisible = ref(false);
const cursorStyle = computed(() => ({
  transform: `translate(${curX.value}px, ${curY.value}px)`,
  opacity: curVisible.value ? 1 : 0,
}));
function animateCursorTo(xTarget: number, yTarget: number, duration = 1300) {
  const x0 = curX.value,
    y0 = curY.value;
  const dx = xTarget - x0,
    dy = yTarget - y0;
  const t0 = performance.now();
  curVisible.value = true;
  const ease = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / duration),
      e = ease(p);
    curX.value = x0 + dx * e;
    curY.value = y0 + dy * e;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function domClick(el: HTMLElement) {
  el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  el.click?.();
}
async function moveAndClick(el: HTMLElement, delay = 980, dur = 1100) {
  const r = el.getBoundingClientRect();
  animateCursorTo(
    r.left + window.scrollX + r.width / 2,
    r.top + window.scrollY + r.height / 2,
    dur,
  );
  await sleep(delay);
  domClick(el);
}

/* Spotlight */
const ring = ref({ visible: false, x: 0, y: 0, w: 0, h: 0 });
let currentEl: HTMLElement | null = null;

function removeAllHighlights() {
  document
    .querySelectorAll(".tour-highlight")
    .forEach((n) => n.classList.remove("tour-highlight"));
}
function highlight(el: HTMLElement | null) {
  removeAllHighlights();
  if (el) el.classList.add("tour-highlight");
}
function placeRing(el: HTMLElement | null) {
  if (!el) {
    ring.value.visible = false;
    return;
  }
  const r = el.getBoundingClientRect(),
    pad = 8;
  ring.value = {
    visible: true,
    x: Math.max(0, r.left + window.scrollX - pad),
    y: Math.max(0, r.top + window.scrollY - pad),
    w: r.width + pad * 2,
    h: r.height + pad * 2,
  };
}
function waitForScrollSettled(timeoutMs = 1100): Promise<void> {
  const start = performance.now();
  let lx = window.scrollX,
    ly = window.scrollY;
  return new Promise((resolve) => {
    function tick() {
      const sx = window.scrollX,
        sy = window.scrollY;
      if (sx === lx && sy === ly) return resolve();
      lx = sx;
      ly = sy;
      if (performance.now() - start > timeoutMs) return resolve();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}
let resizeObs: ResizeObserver | null = null;
let mutObs: MutationObserver | null = null;
let rafGuard = false;
function syncRing() {
  if (rafGuard) return;
  rafGuard = true;
  requestAnimationFrame(() => {
    rafGuard = false;
    if (currentEl) placeRing(currentEl);
  });
}
window.addEventListener("scroll", syncRing, { passive: true });
window.addEventListener("resize", syncRing);
function observeTarget(el: HTMLElement | null) {
  resizeObs?.disconnect();
  resizeObs = null;
  if (el) {
    resizeObs = new ResizeObserver(() => syncRing());
    resizeObs.observe(el);
  }
}

/* Fokus auf Selektor (mit Guard) */
async function focusSelector(sel: string, click = false, dur = 1300) {
  await nextTick();
  const el0 = document.querySelector(sel) as HTMLElement | null;
  currentEl = el0;
  highlight(el0);
  observeTarget(el0);
  if (!el0) {
    ring.value.visible = false;
    curVisible.value = false;
    return;
  }
  const el: HTMLElement = el0;

  el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  await waitForScrollSettled();
  await nextTick();
  placeRing(el);

  const r = el.getBoundingClientRect();
  animateCursorTo(
    r.left + window.scrollX + r.width / 2,
    r.top + window.scrollY + r.height / 2,
    dur,
  );
  if (click) {
    await sleep(980);
    domClick(el);
  }
}

/* Selektoren */
const SEL = {
  env: "#env-setup",
  envArmsInput:
    '#env-setup [data-testid="arms"], #env-setup input[type="number"]',
  envArmsInc: '#env-setup [data-testid="arms-inc"]',
  envArmsDec: '#env-setup [data-testid="arms-dec"]',

  manual: "#manual-section",
  thumbsGrid: "#manual-section .thumb-grid",

  mode: "#mode-switch",

  runner: "#runner-controls",

  chart: "#chart-area",

  table: "#comparison-table",
  tableHead: "#comparison-table .head",
};

function findButtonByText(rootSel: string, text: string): HTMLElement | null {
  const root =
    (document.querySelector(rootSel) as HTMLElement | null) ?? document.body;
  const t = text.trim().toLowerCase();
  const btns = Array.from(
    root.querySelectorAll("button, [role='button']"),
  ) as HTMLElement[];
  return (
    btns.find((b) => (b.textContent || "").trim().toLowerCase().includes(t)) ??
    null
  );
}

/* Stepper-Klicks (mit Guards) */
async function clickArmsPlus() {
  let el: HTMLElement | null =
    (document.querySelector(SEL.envArmsInc) as HTMLElement | null) ??
    (document.querySelector(
      `${SEL.env} .numeric-stepper [data-testid="inc"]`,
    ) as HTMLElement | null) ??
    (Array.from(
      document.querySelectorAll(`${SEL.env} .numeric-stepper button`),
    ).find(
      (b: Element) =>
        (b.textContent || "").trim() === "+" ||
        (b.getAttribute("aria-label") || "").toLowerCase().includes("plus"),
    ) as HTMLElement | null);
  if (!el) el = document.querySelector(SEL.envArmsInput) as HTMLElement | null;
  if (!el) return;
  await moveAndClick(el);
}
async function clickArmsMinus() {
  let el: HTMLElement | null =
    (document.querySelector(SEL.envArmsDec) as HTMLElement | null) ??
    (document.querySelector(
      `${SEL.env} .numeric-stepper [data-testid="dec"]`,
    ) as HTMLElement | null) ??
    (Array.from(
      document.querySelectorAll(`${SEL.env} .numeric-stepper button`),
    ).find((b: Element) => {
      const t = (b.textContent || "").trim();
      const a = (b.getAttribute("aria-label") || "").toLowerCase();
      return t === "−" || t === "-" || a.includes("minus");
    }) as HTMLElement | null);
  if (!el) el = document.querySelector(SEL.envArmsInput) as HTMLElement | null;
  if (!el) return;
  await moveAndClick(el);
}

/* Mode-Klicks (mit Guards) */
async function clickModeAlgo() {
  const el: HTMLElement | null =
    findButtonByText(SEL.mode, "algorithmus") ??
    (document.querySelector(
      `${SEL.mode} [data-mode="algo"]`,
    ) as HTMLElement | null) ??
    (document.querySelector(
      `${SEL.mode} button:last-child`,
    ) as HTMLElement | null);
  if (!el) return;
  await moveAndClick(el);
}
async function clickModeManual() {
  const el: HTMLElement | null =
    findButtonByText(SEL.mode, "manuell") ??
    (document.querySelector(
      `${SEL.mode} [data-mode="manual"]`,
    ) as HTMLElement | null) ??
    (document.querySelector(
      `${SEL.mode} button:first-child`,
    ) as HTMLElement | null);
  if (!el) return;
  await moveAndClick(el);
}

/* Shepherd – striktes Modal: keine Interaktion außerhalb */
let tour: any = null;

async function start() {
  if (tour) {
    try {
      tour.cancel();
    } catch {}
    tour = null;
  }

  // Seite fixieren (kein Scroll außerhalb)
  document.documentElement.classList.add("tour-lock");
  document.body.classList.add("tour-lock");

  try {
    await props.hooks.resetBaseline();
  } catch {}
  await nextTick();
  await sleep(400);

  tour = new (Shepherd as any).Tour({
    useModalOverlay: true,
    exitOnEsc: false, // ESC deaktivieren
    keyboardNavigation: false, // nur Buttons
    defaultStepOptions: {
      scrollTo: false,
      cancelIcon: { enabled: true }, // nur Kreuz erlaubt
      canClickTarget: false, // keine Klicks am Ziel-Element
      modalOverlayOpeningPadding: 8,
      modalOverlayOpeningRadius: 12,
      classes: "bl-step",
    },
  });

  type StepDef = {
    id: string;
    attach: { element: string; on: "top" | "right" | "bottom" | "left" };
    title: string;
    text: string | string[];
    run: () => Promise<void>;
  };

  const steps: StepDef[] = [
    {
      id: "env-stepper",
      attach: { element: SEL.env, on: "bottom" },
      title: "1/12 – Environment & Stepper",
      text: [
        "Wir fügen ein Thumbnail hinzu (Arme +1) und entfernen es wieder (Arme −1).",
        "Nur „Zurück“, „Weiter“ oder das Kreuz sind aktiv.",
      ],
      run: async () => {
        await focusSelector(SEL.env);
        await clickArmsPlus();
        await props.hooks.incArms();
        await sleep(900);
        await clickArmsMinus();
        await props.hooks.decArms();
        await sleep(900);
      },
    },
    {
      id: "manual-thumbs",
      attach: { element: SEL.manual, on: "bottom" },
      title: "2/12 – Thumbnails klicken",
      text: "Wir klicken drei Thumbnails nacheinander. Policies laufen je 1 Schritt mit.",
      run: async () => {
        await props.hooks.switchToManual();
        await clickModeManual();
        await focusSelector(SEL.manual);

        const clickThumb = async (n: number) => {
          const btn = document.querySelector(
            `${SEL.thumbsGrid} button:nth-of-type(${n + 1})`,
          ) as HTMLElement | null;
          if (btn) await moveAndClick(btn);
          await props.hooks.manualClick(n);
          await sleep(950);
        };
        await clickThumb(0);
        await clickThumb(1);
        await clickThumb(2);
      },
    },
    {
      id: "to-algo",
      attach: { element: SEL.mode, on: "bottom" },
      title: "3/12 – Algo-Modus",
      text: "Sichtbarer Wechsel in den Algo-Modus.",
      run: async () => {
        await clickModeAlgo();
        await props.hooks.switchToAlgo();
        await sleep(1000);
      },
    },
    {
      id: "runner-explain",
      attach: { element: SEL.runner, on: "bottom" },
      title: "4/12 – Automatischer Lauf",
      text: [
        "„Iterationen“: maximale Schrittzahl (0 = ∞).",
        "„Schritte/s“: Ausführungsgeschwindigkeit.",
      ],
      run: async () => {
        await focusSelector(SEL.runner);
        await sleep(900);
      },
    },
    {
      id: "runner-start",
      attach: { element: SEL.runner, on: "bottom" },
      title: "5/12 – Start",
      text: "Wir starten den Runner.",
      run: async () => {
        const start: HTMLElement | null =
          (document.querySelector(
            '#runner-controls [data-testid="runner-start"]',
          ) as HTMLElement | null) ??
          findButtonByText(SEL.runner, "start") ??
          findButtonByText(SEL.runner, "starten") ??
          findButtonByText(SEL.runner, "play");
        if (start) await moveAndClick(start);
        await props.hooks.runnerStart();
        await sleep(1300);
      },
    },
    {
      id: "chart-show",
      attach: { element: SEL.chart, on: "top" },
      title: "6/12 – Graph",
      text: "Serienverläufe; der manuelle Graph ist im Algo-Modus ausgeblendet.",
      run: async () => {
        await focusSelector(SEL.chart);
        await sleep(900);
      },
    },
    {
      id: "metrics-switch",
      attach: { element: SEL.chart, on: "top" },
      title: "7/12 – Metriken wechseln",
      text: "Wechsel auf Ø-Reward.",
      run: async () => {
        const pill: HTMLElement | null =
          (document.querySelector(
            '#chart-area [data-testid^="metric-avg"]',
          ) as HTMLElement | null) ??
          (document.querySelector(
            "#chart-area .metric-pills .pill:nth-child(2)",
          ) as HTMLElement | null);
        if (pill) await moveAndClick(pill);
        await props.hooks.setMetric("avgReward");
        await sleep(1000);
      },
    },
    {
      id: "series-toggle",
      attach: { element: SEL.chart, on: "top" },
      title: "8/12 – Serie ein-/ausblenden",
      text: "Eine Legenden-Pille toggeln (z. B. „Greedy“).",
      run: async () => {
        const pill: HTMLElement | null =
          (document.querySelector(
            "#chart-area .legend .pill:nth-child(2)",
          ) as HTMLElement | null) ??
          (document.querySelectorAll(
            "#chart-area .pill",
          )[1] as HTMLElement | null);
        if (pill) await moveAndClick(pill);
        await props.hooks.toggleSeries("greedy", false);
        await sleep(900);
      },
    },
    {
      id: "table-open",
      attach: { element: SEL.table, on: "top" },
      title: "9/12 – Vergleichstabelle öffnen",
      text: "Öffnen der Tabelle.",
      run: async () => {
        const head = document.querySelector(
          SEL.tableHead,
        ) as HTMLElement | null;
        if (head) await moveAndClick(head);
        await props.hooks.openTable();
        await sleep(900);
      },
    },
    {
      id: "table-explain",
      attach: { element: SEL.table, on: "top" },
      title: "10/12 – Kennzahlen",
      text: [
        "<b>Σ Reward</b>: Summe der Rewards.",
        "<b>Ø Reward</b>: Σ Reward / n.",
        "<b>Best-Quote</b>: Anteil optimaler Züge.",
      ],
      run: async () => {
        await sleep(1400);
      },
    },
    {
      id: "table-close",
      attach: { element: SEL.table, on: "top" },
      title: "11/12 – Tabelle schließen",
      text: "Zuklappen.",
      run: async () => {
        const head = document.querySelector(
          SEL.tableHead,
        ) as HTMLElement | null;
        if (head) await moveAndClick(head);
        await props.hooks.closeTable();
        await sleep(800);
      },
    },
    {
      id: "finish",
      attach: { element: "#btn-tutorial", on: "bottom" },
      title: "12/12 – Abschluss",
      text: "Ausgangszustand wiederherstellen (Manuell, 3 Thumbnails, leere Daten).",
      run: async () => {
        try {
          await props.hooks.runnerPause();
        } catch {}
        await props.hooks.restoreBaseline();
        await sleep(450);
      },
    },
  ];

  steps.forEach((s, i) => {
    tour.addStep({
      id: s.id,
      title: s.title,
      text: s.text,
      attachTo: s.attach as any,
      when: {
        show: async () => {
          await s.run();
        },
      },
      buttons: [
        {
          text: "Zurück",
          action: () => tour.back(),
          classes: "shepherd-button-secondary",
        },
        {
          text: i === steps.length - 1 ? "Fertig" : "Weiter",
          action: () => tour.next(),
        },
      ],
    });
  });

  tour.on("complete", () => forceClose());
  tour.on("cancel", () => forceClose());

  tour.start();

  // Spotlight bei DOM-Änderungen synchron halten
  mutObs?.disconnect();
  mutObs = new MutationObserver(() => syncRing());
  mutObs.observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true,
  });
}

function forceClose() {
  cleanup();
  openLocal.value = false;
  emit("close");
}

/* Cleanup */
function cleanup() {
  try {
    tour?.cancel();
  } catch {}
  tour = null;
  ring.value.visible = false;
  curVisible.value = false;
  highlight(null);
  currentEl = null;
  resizeObs?.disconnect();
  resizeObs = null;
  mutObs?.disconnect();
  mutObs = null;
  document.documentElement.classList.remove("tour-lock");
  document.body.classList.remove("tour-lock");
}

watch(
  () => props.open,
  (v) => {
    openLocal.value = v;
    if (v) start();
    else cleanup();
  },
);
onMounted(() => {
  if (props.open) {
    openLocal.value = true;
    start();
  }
});
onBeforeUnmount(() => {
  window.removeEventListener("scroll", syncRing);
  window.removeEventListener("resize", syncRing);
  cleanup();
});
</script>

<style scoped>
/* Vollflächige Sperre */
.tour-root {
  position: fixed;
  inset: 0;
  z-index: 3000;
  pointer-events: none;
}
.tour-dim {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  pointer-events: auto;
}

/* Scroll-Lock während des Tutorials */
:global(.tour-lock) {
  overflow: hidden !important;
}

/* Spotlight */
.focus-ring {
  position: absolute;
  pointer-events: none;
  border: 2px solid rgba(120, 160, 255, 0.98);
  box-shadow:
    0 0 0 6px rgba(120, 160, 255, 0.2),
    0 12px 30px rgba(0, 0, 0, 0.45);
  border-radius: 12px;
  transition: all 0.18s ease;
}

/* Ghost-Cursor – sichtbar & smooth */
.ghost-cursor {
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow:
    0 0 0 3px rgba(255, 255, 255, 0.35),
    0 0 12px rgba(255, 255, 255, 0.5);
  transition:
    transform 0.25s ease,
    opacity 0.2s ease;
  mix-blend-mode: difference;
  pointer-events: none;
  opacity: 1;
}

/* optisches Ziel-Highlight */
.tour-highlight {
  position: relative;
  z-index: 2147483000 !important;
  box-shadow:
    0 0 0 3px rgba(120, 160, 255, 0.9),
    0 0 0 12px rgba(120, 160, 255, 0.18),
    0 10px 30px rgba(0, 0, 0, 0.5);
  border-radius: 10px;
}

/* Shepherd-Dialogbreite */
:global(.shepherd-element.bl-step .shepherd-content) {
  max-width: 460px;
}
</style>
