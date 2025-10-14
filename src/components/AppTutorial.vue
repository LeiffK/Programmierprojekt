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
const isCancelling = ref(false);
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
  if (isCancelling.value) return;
  const r = el.getBoundingClientRect();
  animateCursorTo(r.left + r.width / 2, r.top + r.height / 2, dur);
  await sleep(delay);
  if (isCancelling.value) return;
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
    x: Math.max(0, r.left - pad),
    y: Math.max(0, r.top - pad),
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
  if (isCancelling.value) return;
  await nextTick();
  if (isCancelling.value) return;
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
  if (isCancelling.value) return;
  await nextTick();
  if (isCancelling.value) return;
  placeRing(el);

  const r = el.getBoundingClientRect();
  animateCursorTo(r.left + r.width / 2, r.top + r.height / 2, dur);
  if (click) {
    await sleep(980);
    if (isCancelling.value) return;
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

  // Cancellation-Flag zurücksetzen
  isCancelling.value = false;

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
      title: "1/12 – Umgebung & Anzahl der Varianten",
      text: [
        'Hier legst du fest, wie viele Varianten (auch "Arme" genannt) getestet werden sollen. Jede Variante wird als Kachel dargestellt.',
        "Mit <b>+1</b> fügst du eine weitere Variante hinzu, mit <b>−1</b> entfernst du eine.",
        "Der <b>Seed</b> (Startwert) sorgt dafür, dass du Experimente genau reproduzieren kannst – mit demselben Seed erhältst du immer dieselben Ergebnisse.",
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
      title: "2/12 – Varianten selbst testen",
      text: [
        "Im <b>manuellen Modus</b> kannst du selbst Varianten auswählen. Klicke eine Kachel an und sieh sofort, wie viele Punkte diese Variante bringt.",
        "Gleichzeitig führen die <b>Algorithmen</b> im Hintergrund ebenfalls jeweils einen Schritt aus – so kannst du deine Strategie mit den automatischen Verfahren vergleichen.",
      ],
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
      title: "3/12 – Algorithmus-Modus",
      text: [
        "Jetzt schalten wir in den <b>Algorithmus-Modus</b>. Hier laufen die Algorithmen automatisch, ohne dass du manuell klickst.",
        "Deine manuelle Linie wird nun ausgeblendet, damit du die verschiedenen Algorithmen besser miteinander vergleichen kannst.",
      ],
      run: async () => {
        await clickModeAlgo();
        await props.hooks.switchToAlgo();
        await sleep(1000);
      },
    },
    {
      id: "runner-explain",
      attach: { element: SEL.runner, on: "bottom" },
      title: "4/12 – Algorithmen steuern",
      text: [
        "<b>Gesamtschritte</b>: Lege fest, wie viele Entscheidungen die Algorithmen treffen sollen. Bei 0 laufen sie endlos, bis du sie anhältst.",
        "<b>Schritte/Sekunde</b>: Bestimmt das Tempo. Je höher der Wert, desto schneller laufen die Algorithmen.",
        "Alle Änderungen werden sofort übernommen – du musst nichts speichern.",
      ],
      run: async () => {
        await focusSelector(SEL.runner);
        await sleep(900);
      },
    },
    {
      id: "runner-start",
      attach: { element: SEL.runner, on: "bottom" },
      title: "5/12 – Algorithmen starten",
      text: [
        "Mit <b>Start</b> beginnen die Algorithmen zu laufen. Derselbe Button wird zu <b>Pause</b>, um sie wieder anzuhalten.",
        "Mit <b>+1 Schritt</b> führst du genau eine Entscheidung aus – perfekt, um die Entwicklung Schritt für Schritt zu verfolgen.",
      ],
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
      title: "6/12 – Diagramm verstehen",
      text: [
        "Das Diagramm zeigt, wie sich die verschiedenen Algorithmen im Laufe der Zeit entwickeln. Jeder Algorithmus hat seine eigene farbige Linie.",
        "Über die Legende unter dem Diagramm kannst du einzelne Linien ein- oder ausblenden, um gezielt Algorithmen zu vergleichen.",
      ],
      run: async () => {
        await focusSelector(SEL.chart);
        await sleep(900);
      },
    },
    {
      id: "metrics-switch",
      attach: { element: SEL.chart, on: "top" },
      title: "7/12 – Verschiedene Ansichten",
      text: [
        "Wir wechseln zur Ansicht <b>Durchschnitt</b> (Ø-Reward). Das Zeichen Ø steht dabei für den Durchschnitt.",
        "Diese Ansicht zeigt dir, welcher Algorithmus im Schnitt die meisten Punkte pro Schritt sammelt – ein wichtiger Indikator für die Qualität.",
      ],
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
      title: "8/12 – Algorithmen vergleichen",
      text: [
        "Klicke in der Legende auf einen Algorithmus-Namen (z. B. Greedy), um dessen Linie ein- oder auszublenden.",
        "So kannst du einzelne Algorithmen direkt gegenüberstellen und ihre Unterschiede besser erkennen.",
      ],
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
      title: "9/12 – Kennzahlen-Tabelle",
      text: [
        "Die Tabelle fasst alle wichtigen Kennzahlen für jeden Algorithmus übersichtlich zusammen.",
        "Die Sichtbarkeit ist mit dem Diagramm verknüpft: Wenn du eine Linie ausblendest, verschwindet auch die entsprechende Zeile in der Tabelle.",
      ],
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
      title: "10/12 – Kennzahlen erklärt",
      text: [
        "<b>Gesamtpunkte (Σ Reward)</b>: Die Summe aller gesammelten Punkte.",
        "<b>Durchschnitt (Ø Reward)</b>: Durchschnittliche Punkte pro Entscheidung.",
        "<b>Trefferquote (Best-Quote)</b>: Wie oft wurde die beste Variante gewählt? (höher ist besser)",
        "<b>Regret</b>: Verpasste Punkte im Vergleich zur theoretisch besten Strategie (niedriger ist besser).",
        "<b>Zuletzt</b>: Punkte der allerletzten Entscheidung – zeigt die aktuelle Form.",
      ],
      run: async () => {
        await sleep(1400);
      },
    },
    {
      id: "table-close",
      attach: { element: SEL.table, on: "top" },
      title: "11/12 – Ansicht anpassen",
      text: [
        "Wir klappen die Tabelle wieder zu, um mehr Platz für das Diagramm zu schaffen.",
        "Du kannst sie jederzeit wieder einblenden – alle deine Einstellungen bleiben erhalten.",
      ],
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
      title: "12/12 – Fertig!",
      text: [
        "Super! Das Tutorial ist abgeschlossen. Wir setzen nun alles zurück: Modus <b>Manuell</b>, drei Varianten, leere Daten.",
        "Profi-Tipp: Mit dem <b>Debug-Schalter</b> oben rechts siehst du die wahren Zielwerte jeder Variante und erhältst ein detailliertes Protokoll aller Entscheidungen.",
      ],
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
  // Flag setzen, damit laufende Animationen stoppen
  isCancelling.value = true;
  cleanup();
  openLocal.value = false;
  emit("close");
}

/* Cleanup */
function cleanup() {
  // Flag setzen, um alle async-Operationen zu stoppen
  isCancelling.value = true;
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
  position: fixed;
  pointer-events: none;
  border: 2px solid rgba(120, 160, 255, 0.98);
  box-shadow:
    0 0 0 6px rgba(120, 160, 255, 0.2),
    0 12px 30px rgba(0, 0, 0, 0.45);
  border-radius: 12px;
  transition: all 0.18s ease;
  z-index: 9999;
}

/* Ghost-Cursor – sichtbar & smooth */
.ghost-cursor {
  position: fixed;
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
  opacity: 0;
  z-index: 10000;
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
