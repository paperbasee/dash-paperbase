import { apiErrorParts, type ThemeDocument, type ThemeDraftSaved } from "./api";

/*
 * Autosave for the theme editor: the private draft is saved once edits settle, one save at a
 * time, each carrying the draft revision the last one returned. Pure: the request and the
 * timers are handed in, so the rules are tested without a browser.
 *
 * - An edit waits for AUTOSAVE_DELAY_MS of quiet; `flush` sends at once (closing, hiding the tab).
 * - An edit made while a save is out is kept: sent as soon as that save lands if its wait is
 *   over by then, else when the wait ends.
 * - A document the server already has is not sent again (an edit undone before its save), and
 *   the status goes back to what it was: Saved, or nothing when there is no draft.
 * - 409: the draft changed somewhere else. Autosave stops; only a reload continues.
 * - 403: this member or this shop may no longer edit. Autosave stops.
 * - 400 invalid_document: nothing more is sent until the next edit; an edit back to the refused
 *   document shows the same refusal again.
 * - Anything else (offline, a 5xx): failed, sent again by Retry or the next edit.
 */

export const AUTOSAVE_DELAY_MS = 800;

export type AutosaveStatus =
  /** Nothing saved in this session and no draft on the server. */
  | { kind: "idle" }
  /** Waiting for edits to settle, or sending. */
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "failed" }
  | { kind: "invalid"; path: string; document: ThemeDocument }
  | { kind: "conflict" }
  | { kind: "refused"; error: unknown };

export type AutosaveSnapshot = {
  status: AutosaveStatus;
  /** The server's draft revision as this editor last saw it. */
  draftRevision: number;
  /** The latest document is not on the server yet. */
  unsent: boolean;
};

export type AutosaveTimers = {
  set(run: () => void, ms: number): unknown;
  clear(handle: unknown): void;
};

export type AutosaveOptions = {
  /** The document and revision the server has now. */
  document: ThemeDocument;
  draftRevision: number;
  hasDraft: boolean;
  send(document: ThemeDocument, expectedDraftRevision: number): Promise<ThemeDraftSaved>;
  onChange(snapshot: AutosaveSnapshot): void;
  /** A save landed; the preview can redraw at this version. */
  onSaved(previewVersion: string): void;
  delayMs?: number;
  timers?: AutosaveTimers;
};

export type Autosave = {
  edit(document: ThemeDocument): void;
  /** Send now. Resolves once nothing is being sent. */
  flush(): Promise<void>;
  snapshot(): AutosaveSnapshot;
};

const browserTimers: AutosaveTimers = {
  set: (run, ms) => setTimeout(run, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

function failure(error: unknown, document: ThemeDocument): AutosaveStatus {
  const { status, code, path } = apiErrorParts(error);
  if (status === 409) return { kind: "conflict" };
  if (status === 403) return { kind: "refused", error };
  if (status === 400 && code === "invalid_document") return { kind: "invalid", path: path ?? "", document };
  return { kind: "failed" };
}

export function createAutosave(options: AutosaveOptions): Autosave {
  const { send, onChange, onSaved, delayMs = AUTOSAVE_DELAY_MS, timers = browserTimers } = options;
  let savedText = JSON.stringify(options.document);
  let latest = options.document;
  let latestText = savedText;
  let revision = options.draftRevision;
  let hasDraft = options.hasDraft;
  let status: AutosaveStatus = hasDraft ? { kind: "saved" } : { kind: "idle" };
  let timer: unknown = null;
  let sending: Promise<void> | null = null;
  // A flush asked for while a save was out: send right after it.
  let queued = false;
  // The document a 400 refused, and that refusal: sent again only once it changes.
  let refused: { text: string; status: AutosaveStatus } | null = null;

  const stopped = () => status.kind === "conflict" || status.kind === "refused";
  const snapshot = (): AutosaveSnapshot => ({ status, draftRevision: revision, unsent: latestText !== savedText });
  const emit = () => onChange(snapshot());

  function clearTimer() {
    if (timer !== null) timers.clear(timer);
    timer = null;
  }

  function flush(): Promise<void> {
    clearTimer();
    if (stopped()) return Promise.resolve();
    if (sending) {
      queued = true;
      return sending;
    }
    // Nothing to send: take back the "Saving…" the edit showed.
    let settled: AutosaveStatus | null = null;
    if (refused?.text === latestText) settled = refused.status;
    else if (latestText === savedText) settled = hasDraft ? { kind: "saved" } : { kind: "idle" };
    if (settled) {
      if (status.kind === "saving") {
        status = settled;
        emit();
      }
      return Promise.resolve();
    }

    const document = latest;
    const text = latestText;
    status = { kind: "saving" };
    emit();
    sending = send(document, revision).then(
      (result) => {
        sending = null;
        revision = result.draft_revision;
        savedText = text;
        hasDraft = true;
        onSaved(result.preview_version);
        if (queued || (timer === null && latestText !== savedText)) {
          queued = false;
          return flush();
        }
        // Otherwise an edit made during the save is still waiting for its quiet period.
        if (timer === null) status = { kind: "saved" };
        emit();
      },
      (error: unknown) => {
        sending = null;
        queued = false;
        status = failure(error, document);
        if (status.kind === "invalid") refused = { text, status };
        if (stopped()) clearTimer();
        emit();
      },
    );
    return sending;
  }

  function edit(document: ThemeDocument) {
    const text = JSON.stringify(document);
    if (text === latestText) return;
    latest = document;
    latestText = text;
    if (!stopped()) {
      clearTimer();
      status = { kind: "saving" };
      timer = timers.set(() => {
        timer = null;
        void flush();
      }, delayMs);
    }
    emit();
  }

  return { edit, flush, snapshot };
}
