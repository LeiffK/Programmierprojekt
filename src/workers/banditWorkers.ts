import { pullAction } from "../api/banditClient";

// Nachrichten, die der Worker versteht (UI -> Worker)
type ToWorker =
  | {
      type: "CONFIGURE";
      payload: { envId: string; totalSteps: number; rate: number };
    }
  | { type: "START" }
  | { type: "STOP" }
  | { type: "STEP" } // Einzelschritt
  | { type: "ALGO_ACTION"; payload: { action: number } }; // Antwort vom Algo (wenns den mal gibt)

// Nachrichten, die der Worker zurückschickt (Worker -> UI)
type FromWorker =
  | { type: "READY" }
  | {
      type: "CONFIGURED";
      payload: { envId: string; totalSteps: number; rate: number };
    }
  | { type: "STARTED" }
  | { type: "STOPPED"; payload?: { reason?: string } }
  | { type: "REQUEST_ACTION"; payload: { step: number } }
  | {
      type: "RESULT";
      payload: {
        step: number;
        action: number;
        reward: number;
        isOptimal: boolean;
      };
    }
  | {
      type: "PROGRESS";
      payload: { step: number; remaining: number; total: number };
    }
  | { type: "ERROR"; payload: { message: string } };

// interner Zustand, hier merkt sich der Worker wo er grad steht
interface State {
  envId: string | null;
  totalSteps: number;
  rate: number; // Schritte pro sekunde
  step: number;
  running: boolean;
  awaitingAction: boolean; // wenn true, wartet Worker auf Algo-Antwort
  timer: number | null; // setInterval Referenz, wir nennen ihn Timer
}

// der Startzustand
const state: State = {
  envId: null,
  totalSteps: 0,
  rate: 1,
  step: 0,
  running: false,
  awaitingAction: false,
  timer: null,
};

// kleine Abkürzung, damit wir nicht ständig "postMessage" tippen
function post(msg: FromWorker) {
  postMessage(msg);
}

// Timer aufräumen, sonst läuft er und läuft und läuft
function clearTimer() {
  if (state.timer != null) {
    clearInterval(state.timer);
    state.timer = null;
  }
}

// stoppen, also den ganzen
function stop(reason?: string) {
  clearTimer();
  state.running = false;
  state.awaitingAction = false;
  post({ type: "STOPPED", payload: { reason } });
}

// prüft ob ein Schritt überhaupt erlaubt/ok ist
function ensureRunnable(): string | null {
  if (!state.envId)
    return "Kein Environment vorhanden. Bitte zuerst initialisieren.";
  if (state.totalSteps <= state.step)
    return "Zielanzahl erreicht. Weitere Schritte sind nicht erforderlich.";
  if (state.rate <= 0) return "Ungültige Rate. Bitte eine Rate > 0 angeben.";
  if (state.awaitingAction)
    return "Es wird bereits eine Aktion angefordert. Bitte kurz warten.";
  return null;
}

// hier passiert das eigentliche Ziehen -> ein Arm wird probiert
async function handleAlgoAction(action: number) {
  if (!state.envId) {
    post({
      type: "ERROR",
      payload: { message: "Kein Environment vorhanden." },
    });
    return stop("Fehler");
  }
  try {
    const res = await pullAction(state.envId, action);
    state.step += 1;

    // Ergebnis rauswerfen, damit die UI was zum Anzeigen hat
    post({
      type: "RESULT",
      payload: {
        step: state.step,
        action: res.action,
        reward: res.reward,
        isOptimal: res.isOptimal,
      },
    });

    // Fortschritt hübsch melden
    post({
      type: "PROGRESS",
      payload: {
        step: state.step,
        remaining: Math.max(0, state.totalSteps - state.step),
        total: state.totalSteps,
      },
    });

    state.awaitingAction = false;

    // wenn wir am Ziel sind -> Feierabend
    if (state.step >= state.totalSteps) {
      return stop("Zielanzahl erreicht");
    }
  } catch (e: any) {
    post({
      type: "ERROR",
      payload: {
        message: `Fehler beim Ziehen am Environment: ${e?.message ?? e}`,
      },
    });
    return stop("Fehler");
  }
}

// Worker fragt bei der UI nach einer Aktion
function requestAction() {
  state.awaitingAction = true;
  post({ type: "REQUEST_ACTION", payload: { step: state.step + 1 } });
}

// ein Tick = ein Schrittversuch (falls erlaubt)
function triggerTick() {
  const err = ensureRunnable();
  if (err) {
    post({ type: "ERROR", payload: { message: err } });
    return stop("Fehler");
  }
  requestAction();
}

// Schleife starten, Worker rennt dann
function startLoop() {
  const ms = Math.max(1, Math.floor(1000 / state.rate));
  clearTimer();
  state.running = true;
  state.timer = setInterval(triggerTick, ms) as unknown as number;
  post({ type: "STARTED" });
}

// hier hören wir zu, was die UI uns zuruft
self.onmessage = (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  switch (msg.type) {
    case "CONFIGURE": {
      const { envId, totalSteps, rate } = msg.payload;
      state.envId = envId;
      state.totalSteps = Math.max(1, totalSteps | 0);
      state.rate = Math.max(1, Math.floor(rate));
      state.step = 0;
      state.awaitingAction = false;
      clearTimer();
      state.running = false;
      post({
        type: "CONFIGURED",
        payload: { envId, totalSteps: state.totalSteps, rate: state.rate },
      });
      break;
    }
    case "START": {
      if (!state.envId)
        return post({
          type: "ERROR",
          payload: { message: "Kein Environment vorhanden." },
        });
      if (state.running)
        return post({
          type: "ERROR",
          payload: { message: "Bereits gestartet." },
        });
      startLoop();
      break;
    }
    case "STOP": {
      stop("Manuell gestoppt");
      break;
    }
    case "STEP": {
      if (!state.envId)
        return post({
          type: "ERROR",
          payload: { message: "Kein Environment vorhanden." },
        });
      if (state.running)
        return post({
          type: "ERROR",
          payload: { message: "Läuft bereits automatisch." },
        });
      const err = ensureRunnable();
      if (err) return post({ type: "ERROR", payload: { message: err } });
      requestAction();
      break;
    }
    case "ALGO_ACTION": {
      if (!state.awaitingAction) {
        post({
          type: "ERROR",
          payload: { message: "Keine Aktionsanfrage offen." },
        });
        return;
      }
      const { action } = msg.payload;
      if (typeof action !== "number" || action < 0) {
        post({
          type: "ERROR",
          payload: { message: "Ungültige Aktion. Bitte Algorithmus prüfen." },
        });
        return stop("Fehler");
      }
      // jetzt wird gezogen
      handleAlgoAction(action);
      break;
    }
    default:
      post({ type: "ERROR", payload: { message: "Unbekannte Nachricht." } });
  }
};
post({ type: "READY" });
