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
  openTruthValues: () => void | Promise<void>;
  closeTruthValues: () => void | Promise<void>;
};

const props = defineProps<{ open: boolean; hooks: TutorialHooks }>();
const emit = defineEmits<{ (e: "close"): void }>();

/* UI-Block state */
const openLocal = ref(false);
let abortFlag = false; // Flag zum Abbrechen laufender Operationen
const activeSleeps = new Set<() => void>(); // Tracke alle aktiven sleep-Promises

const sleep = (ms: number) =>
  new Promise<void>((resolve, reject) => {
    if (abortFlag) return reject(new Error("aborted"));

    let timer: NodeJS.Timeout | null = null;
    let checkInterval: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (checkInterval) clearInterval(checkInterval);
      activeSleeps.delete(cleanup);
    };

    timer = setTimeout(() => {
      cleanup();
      if (abortFlag) reject(new Error("aborted"));
      else resolve();
    }, ms);

    // Prüfe regelmäßig auf abortFlag
    checkInterval = setInterval(() => {
      if (abortFlag) {
        cleanup();
        reject(new Error("aborted"));
      }
    }, 50);

    activeSleeps.add(cleanup);
  });

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
async function moveAndClick(el: HTMLElement, dur = 1100) {
  await nextTick(); // Sicherstellen dass Element im DOM ist
  const r = el.getBoundingClientRect();
  animateCursorTo(
    r.left + window.scrollX + r.width / 2,
    r.top + window.scrollY + r.height / 2,
    dur,
  );
  await sleep(dur + 100); // Animation komplett abwarten + Buffer
  domClick(el);
  await sleep(150); // Nach Klick Zeit für Effekte
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
function waitForScrollSettled(timeoutMs = 1500): Promise<void> {
  const start = performance.now();
  let lx = window.scrollX,
    ly = window.scrollY;
  let stableFrames = 0;
  const requiredStableFrames = 3; // Mind. 3 Frames stabil
  return new Promise((resolve) => {
    function tick() {
      const sx = window.scrollX,
        sy = window.scrollY;
      if (sx === lx && sy === ly) {
        stableFrames++;
        if (stableFrames >= requiredStableFrames) return resolve();
      } else {
        stableFrames = 0;
      }
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
  await sleep(50); // Kurze Pause für DOM-Stabilität
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
  await sleep(100); // Extra Zeit für Layout-Stabilisierung
  placeRing(el);
  await sleep(50); // Ring-Render abwarten

  const r = el.getBoundingClientRect();
  animateCursorTo(
    r.left + window.scrollX + r.width / 2,
    r.top + window.scrollY + r.height / 2,
    dur,
  );
  if (click) {
    await sleep(dur + 200);
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

  truthValuesBtn: '#btn-truth-values',
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
  // Setze abortFlag zurück für neue Tour
  abortFlag = false;

  if (tour) {
    try {
      tour.cancel();
    } catch {}
    tour = null;
  }

  // Warte kurz, um sicherzustellen dass vorherige Tour komplett aufgeräumt ist
  await new Promise((r) => setTimeout(r, 100));

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
      title: "1/13 – Umgebung einrichten",
      text: [
        "Bestimme hier, wie viele Thumbnail-Varianten du testen möchtest. Mit den Pfeiltasten kannst du die Anzahl anpassen.",
      ],
      run: async () => {
        await focusSelector(SEL.env);
        await sleep(200);
        await clickArmsPlus();
        await props.hooks.incArms();
        await nextTick();
        await sleep(400); // DOM-Update abwarten
        await clickArmsMinus();
        await props.hooks.decArms();
        await nextTick();
        await sleep(400);
      },
    },
    {
      id: "manual-thumbs",
      attach: { element: SEL.manual, on: "bottom" },
      title: "2/13 – Manueller Modus",
      text: [
        "Klicke auf ein Thumbnail, um es zu testen. Du siehst sofort, wie viele Punkte die jeweilige Variante bringt. Währenddessen lernen die Algorithmen im Hintergrund mit und treffen parallel eigene Entscheidungen.",
      ],
      run: async () => {
        await props.hooks.switchToManual();
        await nextTick();
        await sleep(300); // Mode-Switch-Effekt abwarten
        await clickModeManual();
        await sleep(200);
        await focusSelector(SEL.manual);

        const clickThumb = async (n: number) => {
          await nextTick();
          await sleep(100);
          const btn = document.querySelector(
            `${SEL.thumbsGrid} button:nth-of-type(${n + 1})`,
          ) as HTMLElement | null;
          if (btn) {
            await moveAndClick(btn);
            await props.hooks.manualClick(n);
            await nextTick();
            await sleep(300); // Chart-Update abwarten
          }
        };
        await clickThumb(0);
        await clickThumb(1);
        await clickThumb(2);
      },
    },
    {
      id: "to-algo",
      attach: { element: SEL.mode, on: "bottom" },
      title: "3/13 – Wechsel in den Algorithmus-Modus",
      text: [
        "Im Algorithmus-Modus laufen ausschließlich die automatischen Strategien. Deine manuelle Linie wird ausgeblendet, sodass du die Algorithmen direkt miteinander vergleichen kannst.",
      ],
      run: async () => {
        await clickModeAlgo();
        await props.hooks.switchToAlgo();
        await nextTick();
        await sleep(400); // Mode-Wechsel und Chart-Update abwarten
      },
    },
    {
      id: "runner-explain",
      attach: { element: SEL.runner, on: "bottom" },
      title: "4/13 – Steuerung konfigurieren",
      text: [
        "Lege fest, wie viele Schritte insgesamt ausgeführt werden sollen. Die Geschwindigkeit bestimmt, wie viele Schritte pro Sekunde die Algorithmen durchlaufen.",
      ],
      run: async () => {
        await focusSelector(SEL.runner);
        await sleep(400);
      },
    },
    {
      id: "runner-start",
      attach: { element: SEL.runner, on: "bottom" },
      title: "5/13 – Simulation starten",
      text: [
        'Klicke auf "Start", um die Algorithmen automatisch laufen zu lassen. Derselbe Button dient anschließend zum Pausieren. Mit "+1 Schritt" kannst du einzelne Schritte manuell ausführen – ideal, um genau zu beobachten, was passiert.',
      ],
      run: async () => {
        await sleep(200);
        const start: HTMLElement | null =
          (document.querySelector(
            '#runner-controls [data-testid="runner-start"]',
          ) as HTMLElement | null) ??
          findButtonByText(SEL.runner, "start") ??
          findButtonByText(SEL.runner, "starten") ??
          findButtonByText(SEL.runner, "play");
        if (start) {
          await moveAndClick(start);
          await props.hooks.runnerStart();
          await nextTick();
          await sleep(800); // Runner-Animation abwarten
        }
      },
    },
    {
      id: "chart-show",
      attach: { element: SEL.chart, on: "top" },
      title: "6/13 – Das Diagramm verstehen",
      text: [
        "Jeder Algorithmus wird als farbige Linie dargestellt – so erkennst du auf einen Blick, wie sich die verschiedenen Strategien entwickeln. Über die Legende kannst du einzelne Linien ein- oder ausblenden.",
      ],
      run: async () => {
        await focusSelector(SEL.chart);
        await sleep(400);
      },
    },
    {
      id: "truth-values",
      attach: { element: SEL.truthValuesBtn, on: "bottom" },
      title: "7/13 – Wahre Werte anzeigen",
      text: [
        "Klicke auf 'Wahre Werte', um die tatsächliche Performance jedes Thumbnails zu sehen. Das beste Thumbnail hat den höchsten Wert. Das ist der Mittelwert.",
      ],
      run: async () => {
        await focusSelector(SEL.truthValuesBtn);
        await sleep(200);
        const btn = document.querySelector(
          SEL.truthValuesBtn,
        ) as HTMLElement | null;
        if (btn) {
          await moveAndClick(btn);
          await props.hooks.openTruthValues();
          await nextTick();
          await sleep(1500); // Modal öffnen und anzeigen
          await props.hooks.closeTruthValues();
          await nextTick();
          await sleep(300); // Modal schließen
        }
      },
    },
    {
      id: "metrics-switch",
      attach: { element: SEL.chart, on: "top" },
      title: "8/13 – Metrik wechseln",
      text: [
        'Wechsle nun zur Metrik "Durchschnitt" (Ø-Reward). Dadurch erkennst du, welcher Algorithmus im Schnitt pro Schritt die meisten Punkte erzielt.',
      ],
      run: async () => {
        await sleep(200);
        const pill: HTMLElement | null =
          (document.querySelector(
            '#chart-area [data-testid^="metric-avg"]',
          ) as HTMLElement | null) ??
          (document.querySelector(
            "#chart-area .metric-pills .pill:nth-child(2)",
          ) as HTMLElement | null);
        if (pill) {
          await moveAndClick(pill);
          await props.hooks.setMetric("avgReward");
          await nextTick();
          await sleep(400); // Chart-Neuzeichnung abwarten
        }
      },
    },
    {
      id: "series-toggle",
      attach: { element: SEL.chart, on: "top" },
      title: "9/13 – Linien ein-/ausblenden",
      text: [
        "Klicke in der Legende auf einen Algorithmus (z. B. Greedy), um dessen Linie ein- oder auszublenden. Dadurch kannst du einzelne Strategien isolieren und gezielter vergleichen.",
      ],
      run: async () => {
        await sleep(200);
        const pill: HTMLElement | null =
          (document.querySelector(
            "#chart-area .legend .pill:nth-child(2)",
          ) as HTMLElement | null) ??
          (document.querySelectorAll(
            "#chart-area .pill",
          )[1] as HTMLElement | null);
        if (pill) {
          await moveAndClick(pill);
          await props.hooks.toggleSeries("greedy", false);
          await nextTick();
          await sleep(400); // Chart-Update abwarten
        }
      },
    },
    {
      id: "table-open",
      attach: { element: SEL.table, on: "top" },
      title: "10/13 – Detailansicht öffnen",
      text: [
        "Die Vergleichstabelle zeigt dir alle wichtigen Kennzahlen auf einen Blick. Algorithmen, die du im Diagramm ausgeblendet hast, werden auch hier nicht angezeigt.",
      ],
      run: async () => {
        // Tabelle öffnen
        await props.hooks.openTable();
        await nextTick();
        await sleep(300);

        // Fokus auf die Tabelle setzen
        await focusSelector(SEL.table);
        await sleep(200);
      },
    },
    {
      id: "table-explain",
      attach: { element: SEL.table, on: "top" },
      title: "11/13 – Kennzahlen erklärt",
      text: [
        "<b>Σ Reward:</b> Die Summe aller gesammelten Punkte ",
        "<b>Ø Reward:</b> Durchschnittliche Punktzahl pro Schritt ",
        "<b>Best-Quote:</b> Wie oft wurde die beste Variante gewählt? (je höher, desto besser) ",
        "<b>Regret:</b> Wie viele Punkte wurden im Vergleich zur perfekten Strategie verpasst? (je niedriger, desto besser) ",
        "<b>Zuletzt:</b> Die Punktzahl des letzten Schritts.",
      ],
      run: async () => {
        await sleep(600);
      },
    },
    {
      id: "table-close",
      attach: { element: SEL.table, on: "top" },
      title: "12/13 – Tabelle wieder schließen",
      text: [
        "Schließe die Tabelle. Du kannst sie jederzeit erneut öffnen – alle Daten bleiben erhalten.",
      ],
      run: async () => {
        await sleep(200);
        const head = document.querySelector(
          SEL.tableHead,
        ) as HTMLElement | null;
        if (head) {
          await moveAndClick(head);
          await props.hooks.closeTable();
          await nextTick();
          await sleep(400); // Tabellen-Animation abwarten
        }
      },
    },
    {
      id: "finish",
      attach: { element: "#btn-tutorial", on: "bottom" },
      title: "13/13 – Tutorial abgeschlossen",
      text: [
        "Geschafft! Du kennst nun alle wichtigen Funktionen. Die App wird zurückgesetzt, damit du mit einem frischen Start experimentieren kannst. Viel Erfolg!",
      ],
      run: async () => {
        try {
          await props.hooks.runnerPause();
          await nextTick();
          await sleep(200);
        } catch {}
        await props.hooks.restoreBaseline();
        await nextTick();
        await sleep(300);
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
          try {
            // Buttons initial deaktivieren
            await nextTick();
            const buttons = document.querySelectorAll(".shepherd-button");
            const originalTexts = new Map<HTMLButtonElement, string>();

            buttons.forEach((btn) => {
              const btnEl = btn as HTMLButtonElement;
              originalTexts.set(btnEl, btnEl.textContent || "");
              btnEl.disabled = true;
              btn.classList.add("shepherd-button-disabled");
            });

            // Countdown-Funktion (läuft parallel zur Step-Logik)
            const runCountdown = async () => {
              let countdown = 3;
              while (countdown > 0) {
                if (abortFlag) throw new Error("aborted");
                buttons.forEach((btn) => {
                  const btnEl = btn as HTMLButtonElement;
                  const originalText = originalTexts.get(btnEl) || "";
                  btnEl.textContent = `${originalText} (${countdown}s)`;
                });
                await sleep(1000);
                countdown--;
              }
            };

            // Step-Logik und Countdown parallel ausführen
            await Promise.all([s.run(), runCountdown()]);

            // Buttons wieder aktivieren und Original-Text wiederherstellen
            buttons.forEach((btn) => {
              const btnEl = btn as HTMLButtonElement;
              btnEl.textContent = originalTexts.get(btnEl) || "";
              btnEl.disabled = false;
              btn.classList.remove("shepherd-button-disabled");
            });
          } catch (err: any) {
            // Ignoriere aborted errors - Tour wurde vorzeitig geschlossen
            if (err?.message === "aborted") {
              return;
            }
            throw err;
          }
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
  // KRITISCH: openLocal SOFORT auf false, damit tour-root und tour-dim aus dem DOM entfernt werden
  openLocal.value = false;

  // Cleanup in separatem Microtask, damit Vue zuerst das Template aktualisieren kann
  Promise.resolve().then(() => {
    cleanup();
  });

  emit("close");
}

/* Cleanup */
function cleanup() {
  // Setze abortFlag sofort, um alle laufenden Operationen abzubrechen
  abortFlag = true;

  // Räume alle aktiven sleep-Promises auf
  activeSleeps.forEach((cleanupFn) => {
    try {
      cleanupFn();
    } catch {}
  });
  activeSleeps.clear();

  try {
    tour?.cancel();
  } catch {}
  tour = null;
  ring.value.visible = false;
  curVisible.value = false;
  curX.value = -9999;
  curY.value = -9999;
  highlight(null);
  currentEl = null;
  resizeObs?.disconnect();
  resizeObs = null;
  mutObs?.disconnect();
  mutObs = null;

  // SOFORT Locks entfernen (NICHT in nextTick!)
  document.documentElement.classList.remove("tour-lock");
  document.body.classList.remove("tour-lock");

  // SOFORT Shepherd-Klassen entfernen
  try {
    document.body.classList.remove("shepherd-active", "shepherd-modal-is-visible");
  } catch {}

  // SOFORT pointer-events wiederherstellen
  try {
    document.body.style.removeProperty("pointer-events");
    document.documentElement.style.removeProperty("pointer-events");
  } catch {}

  // SOFORT Shepherd-Elemente entfernen (NICHT in nextTick!)
  try {
    const shepherdElements = document.querySelectorAll(
      ".shepherd-modal-overlay-container, .shepherd-element, .shepherd-target, .shepherd-modal-is-visible"
    );
    shepherdElements.forEach((el) => {
      try {
        el.remove();
      } catch {}
    });
  } catch {}

  // SOFORT tour-highlight Klassen entfernen
  try {
    document
      .querySelectorAll(".tour-highlight")
      .forEach((el) => {
        try {
          el.classList.remove("tour-highlight");
        } catch {}
      });
  } catch {}

  // Zusätzliche Sicherheits-Checks nach nextTick (falls DOM noch nachhängt)
  nextTick(() => {
    try {
      document.documentElement.classList.remove("tour-lock");
      document.body.classList.remove("tour-lock");
      document.body.classList.remove("shepherd-active", "shepherd-modal-is-visible");
      document.body.style.removeProperty("pointer-events");
      document.documentElement.style.removeProperty("pointer-events");
    } catch {}

    // Nochmal alle Shepherd-Elemente entfernen (falls welche nachgeladen wurden)
    try {
      const shepherdElements = document.querySelectorAll(
        ".shepherd-modal-overlay-container, .shepherd-element, .shepherd-target"
      );
      shepherdElements.forEach((el) => {
        try {
          el.remove();
        } catch {}
      });
    } catch {}
  });

  // Noch ein letzter Check mit setTimeout (für langsame Browser)
  setTimeout(() => {
    try {
      document.documentElement.classList.remove("tour-lock");
      document.body.classList.remove("tour-lock");
      document.body.classList.remove("shepherd-active", "shepherd-modal-is-visible");
      document.body.style.removeProperty("pointer-events");
      document.documentElement.style.removeProperty("pointer-events");

      const shepherdElements = document.querySelectorAll(
        ".shepherd-modal-overlay-container, .shepherd-element, .shepherd-target"
      );
      shepherdElements.forEach((el) => {
        try {
          el.remove();
        } catch {}
      });

      // EXTRA-AGGRESSIV: Entferne ALLE Elemente die pointer-events blockieren könnten
      const allElements = document.querySelectorAll("*");
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);

        // Entferne Elemente mit sehr hohem z-index die blockieren könnten
        if (
          (style.position === "fixed" || style.position === "absolute") &&
          parseInt(style.zIndex) > 2000 &&
          htmlEl.className &&
          (htmlEl.className.includes("shepherd") ||
           htmlEl.className.includes("tour-root") ||
           htmlEl.className.includes("tour-dim"))
        ) {
          try {
            htmlEl.remove();
          } catch {}
        }
      });
    } catch {}
  }, 100);

  // Nochmal ein letzter letzter Check nach 500ms
  setTimeout(() => {
    try {
      document.body.style.removeProperty("pointer-events");
      document.documentElement.style.removeProperty("pointer-events");
      document.documentElement.classList.remove("tour-lock");
      document.body.classList.remove("tour-lock", "shepherd-active", "shepherd-modal-is-visible");

      // Entferne alle verbleibenden Shepherd und Tour Elemente
      const allShepherd = document.querySelectorAll('[class*="shepherd"], [class*="tour"]');
      allShepherd.forEach((el) => {
        try {
          if (el.className.includes("shepherd") || el.className.includes("tour")) {
            (el as HTMLElement).remove();
          }
        } catch {}
      });
    } catch {}
  }, 500);
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      openLocal.value = true;
      start();
    } else {
      // KRITISCH: Sofort openLocal auf false, dann cleanup
      openLocal.value = false;
      Promise.resolve().then(() => {
        cleanup();
      });
    }
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
