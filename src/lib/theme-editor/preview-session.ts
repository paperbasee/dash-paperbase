/*
 * The editor's half of the preview conversation (guidelines/theme-system.md, "The preview's
 * messages (for the editor)"): which messages to trust, and what to do about each one, as a
 * pure state machine. The preview frame runs it: every event returns the next state and the
 * effects to carry out (mint a pass, enter, load a page, ask for a refresh). A wait is part of
 * the state, so the frame only has to start a timer when `wait.id` changes.
 */

export const PREVIEW_REFRESH_MESSAGE = "pb-preview:refresh";

/** A refused or failed entry sends nothing at all, so every wait times out. */
export const PREVIEW_ENTER_WAIT_MS = 15_000;
export const PREVIEW_REFRESH_WAIT_MS = 10_000;

export type PreviewExpiredReason =
  | "expired_pass"
  | "invalid_pass"
  | "not_allowed"
  | "not_entitled"
  | "stale_session";

const EXPIRED_REASONS: readonly PreviewExpiredReason[] = [
  "expired_pass",
  "invalid_pass",
  "not_allowed",
  "not_entitled",
  "stale_session",
];

export type PreviewMessage =
  | { type: "ready"; storePublicId: string; path: string; version: string }
  | { type: "navigated"; path: string }
  | { type: "refreshed"; version: string }
  | { type: "expired"; reason: PreviewExpiredReason };

const isText = (value: unknown): value is string => typeof value === "string";

/**
 * A message from the preview, or null for anything else. Only a message from exactly `origin`
 * AND sent by the editor's own frame counts: another origin, another window (a second frame, a
 * pop-up, the page itself) or a shape the contract does not name is ignored.
 */
export function readPreviewMessage(
  event: { origin: string; source: unknown; data: unknown },
  origin: string,
  frame: unknown,
): PreviewMessage | null {
  if (!frame || event.origin !== origin || event.source !== frame) return null;
  const data = event.data as Record<string, unknown> | null;
  if (!data || typeof data !== "object") return null;
  switch (data.type) {
    case "pb-preview:ready":
      return isText(data.storePublicId) && isText(data.path) && isText(data.version)
        ? { type: "ready", storePublicId: data.storePublicId, path: data.path, version: data.version }
        : null;
    case "pb-preview:navigated":
      return isText(data.path) ? { type: "navigated", path: data.path } : null;
    case "pb-preview:refreshed":
      return isText(data.version) ? { type: "refreshed", version: data.version } : null;
    case "pb-preview:expired":
      // A reason this editor does not know reads as a bad pass, as the storefront does.
      return {
        type: "expired",
        reason: EXPIRED_REASONS.find((reason) => reason === data.reason) ?? "invalid_pass",
      };
    default:
      return null;
  }
}

export type PreviewPhase =
  /** Getting a pass. */
  | "minting"
  /** The pass was posted into the frame; waiting for `ready`. */
  | "entering"
  /** The frame was sent to a page; waiting for `ready`. */
  | "loading"
  | "shown"
  /** A refresh was sent after a save; waiting for the saved version to be drawn. */
  | "refreshing"
  /** Another tab moved this browser's preview to another store. Never taken back automatically. */
  | "otherStore"
  /** This member or this store may no longer preview. */
  | "stopped"
  /** Entering again did not bring the preview back. */
  | "unavailable";

export type PreviewState = {
  phase: PreviewPhase;
  /** The store being edited; every `ready` must name it. */
  storePublicId: string;
  hasPass: boolean;
  /** A `ready` for this store has arrived at least once. */
  hasShown: boolean;
  /**
   * How far recovery has gone since the preview last answered: 1 entered again with the same
   * pass, 2 minted a new one. Each is tried once; after that the preview is unavailable.
   */
  rung: 0 | 1 | 2;
  stopReason: "not_allowed" | "not_entitled" | null;
  /** The last mint was refused for opening too many previews in the last hour (429). */
  mintLimited: boolean;
  /** What the frame shows now, e.g. "/en/categories/men". */
  path: string | null;
  /** Where the editor wants the frame; put back after entering again, which lands on home. */
  wantedPath: string | null;
  /** The preview version of the latest saved draft. */
  savedVersion: string;
  /** A `refreshed` arrived since the last refresh was sent: the frame is alive. */
  heard: boolean;
  wait: { id: number; ms: number } | null;
  waits: number;
};

export type PreviewEffect =
  | { type: "mint" }
  | { type: "enter" }
  | { type: "load"; path: string }
  | { type: "refresh" };

export type PreviewEvent =
  | { type: "start" }
  | { type: "minted"; storePublicId: string }
  /** The mint was refused (403): the code says whether the store or the member lost access. */
  | { type: "mintRefused"; reason: "not_allowed" | "not_entitled" }
  /** The mint failed without a refusal: no answer, a 5xx, or `limited` for the hourly limit (429). */
  | { type: "mintFailed"; limited?: boolean }
  | { type: "message"; message: PreviewMessage }
  | { type: "timeout"; id: number }
  | { type: "saved"; version: string }
  /** The page picker wants this path shown. */
  | { type: "show"; path: string }
  /** Reload preview, or show this store here again after another tab took the preview. */
  | { type: "reload" };

export type PreviewStep = { state: PreviewState; effects: PreviewEffect[] };

export function initPreviewState(storePublicId: string, savedVersion: string): PreviewState {
  return {
    phase: "minting",
    storePublicId,
    hasPass: false,
    hasShown: false,
    rung: 0,
    stopReason: null,
    mintLimited: false,
    path: null,
    wantedPath: null,
    savedVersion,
    heard: false,
    wait: null,
    waits: 0,
  };
}

function waiting(state: PreviewState, phase: PreviewPhase, ms: number, effects: PreviewEffect[]): PreviewStep {
  const id = state.waits + 1;
  return { state: { ...state, phase, wait: { id, ms }, waits: id }, effects };
}

function settled(state: PreviewState, phase: PreviewPhase, changes: Partial<PreviewState> = {}): PreviewStep {
  return { state: { ...state, ...changes, phase, wait: null }, effects: [] };
}

const unchanged = (state: PreviewState): PreviewStep => ({ state, effects: [] });

const enterAgain = (state: PreviewState): PreviewStep =>
  waiting({ ...state, rung: 1 }, "entering", PREVIEW_ENTER_WAIT_MS, [{ type: "enter" }]);

const mintAgain = (state: PreviewState): PreviewStep => ({
  state: { ...state, rung: 2, phase: "minting", wait: null },
  effects: [{ type: "mint" }],
});

/** The frame went quiet: same pass first, then a new pass, then give up. */
function recover(state: PreviewState): PreviewStep {
  if (state.rung === 0) return enterAgain(state);
  if (state.rung === 1) return mintAgain(state);
  return settled(state, "unavailable");
}

const pathname = (path: string) => (path.split(/[?#]/)[0] || "/").replace(/(.)\/+$/, "$1");

function onReady(state: PreviewState, message: Extract<PreviewMessage, { type: "ready" }>): PreviewStep {
  // The one store per browser rule: another tab entered another store. Its version means
  // nothing here, and entering again automatically would take the preview back and forth.
  if (message.storePublicId !== state.storePublicId) return settled(state, "otherStore");

  const next: PreviewState = { ...state, path: message.path, hasShown: true, stopReason: null };
  // Entering lands on home: go back to the page the editor was showing.
  if (state.phase === "entering" && state.wantedPath && pathname(state.wantedPath) !== pathname(message.path)) {
    return waiting(next, "loading", PREVIEW_ENTER_WAIT_MS, [{ type: "load", path: state.wantedPath }]);
  }
  // A page the editor asked for keeps its own address (a product may redirect to its category path).
  const shown: PreviewState = { ...next, rung: 0, wantedPath: state.phase === "loading" ? state.wantedPath : message.path };
  if (state.savedVersion && message.version !== state.savedVersion) {
    return waiting({ ...shown, heard: false }, "refreshing", PREVIEW_REFRESH_WAIT_MS, [{ type: "refresh" }]);
  }
  return settled(shown, "shown");
}

function onExpired(state: PreviewState, reason: PreviewExpiredReason): PreviewStep {
  if (reason === "not_allowed" || reason === "not_entitled") {
    return settled(state, "stopped", { stopReason: reason });
  }
  // The build changed since entering: the same pass still works.
  if (reason === "stale_session" && state.rung === 0) return enterAgain(state);
  // The pass itself is refused (expired, damaged, or its session moved on): a new one, once.
  if (state.rung < 2) return mintAgain(state);
  return settled(state, "unavailable");
}

export function previewTransition(state: PreviewState, event: PreviewEvent): PreviewStep {
  switch (event.type) {
    case "start":
      return { state: { ...state, phase: "minting", wait: null }, effects: [{ type: "mint" }] };

    case "minted":
      if (state.phase !== "minting") return unchanged(state);
      return waiting(
        { ...state, hasPass: true, mintLimited: false, storePublicId: state.storePublicId || event.storePublicId },
        "entering",
        PREVIEW_ENTER_WAIT_MS,
        [{ type: "enter" }],
      );

    case "mintRefused":
      if (state.phase !== "minting") return unchanged(state);
      return settled(state, "stopped", { stopReason: event.reason });

    case "mintFailed":
      if (state.phase !== "minting") return unchanged(state);
      return settled(state, "unavailable", { mintLimited: event.limited === true });

    case "timeout": {
      if (event.id !== state.wait?.id) return unchanged(state);
      // Refreshed, just not at the version the save expected (another save, or a draft this
      // storefront cannot draw): the frame is alive, so there is nothing to recover.
      if (state.phase === "refreshing" && state.heard) return settled({ ...state, rung: 0 }, "shown");
      return recover(state);
    }

    case "saved": {
      const next = { ...state, savedVersion: event.version };
      if (state.phase !== "shown" && state.phase !== "refreshing") return unchanged(next);
      return waiting({ ...next, heard: false }, "refreshing", PREVIEW_REFRESH_WAIT_MS, [{ type: "refresh" }]);
    }

    case "show": {
      const next = { ...state, wantedPath: event.path };
      if (state.phase !== "shown" && state.phase !== "refreshing" && state.phase !== "loading") {
        return unchanged(next);
      }
      return waiting(next, "loading", PREVIEW_ENTER_WAIT_MS, [{ type: "load", path: event.path }]);
    }

    case "reload":
      if (state.phase === "minting" || state.phase === "stopped") return unchanged(state);
      if (!state.hasPass) return { state: { ...state, rung: 0, phase: "minting", wait: null }, effects: [{ type: "mint" }] };
      return enterAgain(state);

    case "message": {
      const { message } = event;
      if (message.type === "ready") return onReady(state, message);
      // Everything else describes the store of the last `ready`: not ours while another store
      // shows, and nothing to act on once the preview has stopped.
      if (state.phase === "otherStore" || state.phase === "stopped") return unchanged(state);
      if (message.type === "navigated") {
        // A page the editor is loading stays the one to come back to.
        const wantedPath = state.phase === "loading" ? state.wantedPath : message.path;
        return unchanged({ ...state, path: message.path, wantedPath });
      }
      if (message.type === "refreshed") {
        if (state.phase !== "refreshing") return unchanged(state);
        if (message.version === state.savedVersion) return settled({ ...state, rung: 0, heard: true }, "shown");
        return unchanged({ ...state, heard: true });
      }
      // `expired` can repeat; a new pass is already on its way.
      if (state.phase === "minting") return unchanged(state);
      return onExpired(state, message.reason);
    }
  }
}
