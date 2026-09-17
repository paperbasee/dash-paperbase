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
 * - 409: the draft changed somewhere else. Autosave stops until the merchant chooses: `reset`
 *   after loading the latest, or `resume` to save over it at the revision the 409 named.
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
  /** `draftRevision` is where the draft is now, for saving over it; null if the API didn't say. */
  | { kind: "conflict"; draftRevision: number | null }
  | { kind: "refused"; error: unknown };

export type AutosaveSnapshot = {
  status: AutosaveStatus;
  /** The server's draft revision as this editor last saw it. */
  draftRevision: number;
  /** The latest document is not on the server yet. */
  unsent: boolean;
  /** The server holds a draft: with an unsent edit, this is what Save can put on the shop. */
  hasDraft: boolean;
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
  /**
   * Run `work` with autosave held: the edit still waiting is dropped and nothing new is sent
   * until it finishes. A save already out is awaited first, so a discard or a restore cannot
   * overtake it and find the draft written back afterwards. If `work` leaves something unsent
   * (it failed), the wait starts again.
   */
  hold<T>(work: () => Promise<T>): Promise<T>;
  /**
   * The server's draft has been replaced from the API's own answer (a save, a discard, a
   * restore, the latest loaded after a conflict): start again from it, with nothing unsent.
   */
  reset(next: { document: ThemeDocument; draftRevision: number; hasDraft: boolean }): void;
  /**
   * After a conflict: save this editor's document over the draft, at the revision the 409
   * named. Sent even when the document is the one this editor last saved, because the draft
   * on the server is somebody else's now.
   */
  resume(draftRevision: number): Promise<void>;
  /**
   * The draft is on the shop now: there is no draft any more and the counter has moved on.
   * What is on the screen is left alone, so an edit made while the shop was being updated is
   * still unsent and still saves itself.
   */
  published(draftRevision: number): void;
};

const browserTimers: AutosaveTimers = {
  set: (run, ms) => setTimeout(run, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

function failure(error: unknown, document: ThemeDocument): AutosaveStatus {
  const { status, code, path, draftRevision } = apiErrorParts(error);
  if (status === 409) return { kind: "conflict", draftRevision: draftRevision ?? null };
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
  // Nothing is sent while an action (discard, restore, loading the latest) is running.
  let held = false;
  // Send even a document the server already has: the draft there belongs to another editor now.
  let forced = false;
  // The document a 400 refused, and that refusal: sent again only once it changes.
  let refused: { text: string; status: AutosaveStatus } | null = null;

  const stopped = () => status.kind === "conflict" || status.kind === "refused";
  const snapshot = (): AutosaveSnapshot => ({
    status,
    draftRevision: revision,
    unsent: latestText !== savedText,
    hasDraft,
  });
  const emit = () => onChange(snapshot());

  function clearTimer() {
    if (timer !== null) timers.clear(timer);
    timer = null;
  }

  /** Start the quiet period before the next save. */
  function schedule() {
    if (stopped() || held) return;
    clearTimer();
    status = { kind: "saving" };
    timer = timers.set(() => {
      timer = null;
      void flush();
    }, delayMs);
  }

  function flush(): Promise<void> {
    clearTimer();
    if (stopped() || held) return sending ?? Promise.resolve();
    if (sending) {
      queued = true;
      return sending;
    }
    // Nothing to send: take back the "Saving…" the edit showed.
    let settled: AutosaveStatus | null = null;
    if (refused?.text === latestText) settled = refused.status;
    else if (latestText === savedText && !forced) settled = hasDraft ? { kind: "saved" } : { kind: "idle" };
    if (settled) {
      if (status.kind === "saving") {
        status = settled;
        emit();
      }
      return Promise.resolve();
    }

    const document = latest;
    const text = latestText;
    forced = false;
    status = { kind: "saving" };
    emit();
    sending = send(document, revision).then(
      (result) => {
        sending = null;
        revision = result.draft_revision;
        savedText = text;
        hasDraft = true;
        onSaved(result.preview_version);
        if (!held && (queued || (timer === null && latestText !== savedText))) {
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
    schedule();
    emit();
  }

  async function hold<T>(work: () => Promise<T>): Promise<T> {
    clearTimer();
    queued = false;
    held = true;
    try {
      // A save already out finishes first; `held` keeps its follow-up from going.
      await sending;
      return await work();
    } finally {
      held = false;
      // The action left this editor's edits behind: wait for quiet and send them after all.
      if (latestText !== savedText) {
        schedule();
        emit();
      }
    }
  }

  function reset(next: { document: ThemeDocument; draftRevision: number; hasDraft: boolean }) {
    clearTimer();
    queued = false;
    forced = false;
    refused = null;
    latest = next.document;
    latestText = savedText = JSON.stringify(next.document);
    revision = next.draftRevision;
    hasDraft = next.hasDraft;
    status = hasDraft ? { kind: "saved" } : { kind: "idle" };
    emit();
  }

  function resume(draftRevision: number): Promise<void> {
    held = false;
    revision = draftRevision;
    refused = null;
    forced = true;
    // A 403 is not a choice the merchant can save past, so only a conflict is lifted here.
    if (status.kind === "conflict") status = { kind: "saving" };
    return flush();
  }

  function published(draftRevision: number) {
    revision = draftRevision;
    hasDraft = false;
    if (status.kind === "saved") status = { kind: "idle" };
    emit();
  }

  return { edit, flush, snapshot, hold, reset, resume, published };
}
