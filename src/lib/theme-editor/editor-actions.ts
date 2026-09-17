import type { AutosaveSnapshot, AutosaveStatus } from "./autosave";
import { apiErrorParts, type ThemeDocument, type ThemeEditorState, type ThemePublished } from "./api";

/*
 * The four things a merchant can do to a whole theme — put the draft on the shop, throw the draft
 * away, bring a saved version back, and answer a clash with another editor — as the order each
 * one has to run in. Pure: autosave, the API calls and the screen are handed in, so the order is
 * tested without a browser.
 *
 * Two rules decide every order here:
 *
 * - **Autosave goes first.** Save puts the DRAFT on the shop, not what is on the screen, so an
 *   edit still waiting would be left behind. Discard, restore and loading the latest replace the
 *   draft, so a save already on its way has to land before they run, or it writes the old draft
 *   back a moment later.
 * - **The screen and the manifest arrive together.** A discard or a restore can bring back a
 *   document of another theme, so its manifest comes in the same answer and is put on the screen
 *   with it.
 */

export type EditorAutosave = {
  flush(): Promise<void>;
  snapshot(): AutosaveSnapshot;
  hold<T>(work: () => Promise<T>): Promise<T>;
  reset(next: { document: ThemeDocument; draftRevision: number; hasDraft: boolean }): void;
  resume(draftRevision: number): Promise<void>;
  published(draftRevision: number): void;
};

export type EditorPorts = {
  autosave: EditorAutosave;
  /** POST editor/publish/ */
  publish(expectedDraftRevision: number): Promise<ThemePublished>;
  /** POST editor/discard/ */
  discard(expectedDraftRevision: number): Promise<ThemeEditorState>;
  /** POST editor/versions/<revision>/restore/ */
  restore(revision: number, expectedDraftRevision: number): Promise<ThemeEditorState>;
  /** GET editor/, read again: what the draft is now, whoever changed it. */
  reload(): Promise<ThemeEditorState>;
  /** Put a fresh state on the screen: its document and its manifest. */
  load(state: ThemeEditorState): void;
  /** Have the preview draw this version. */
  refreshPreview(version: string): void;
  /** Throw away the unsent edits this device was keeping. */
  forgetDeviceCopy(): void;
  /** A draft appeared or went, so Settings > Customization must read the library again. */
  themesChanged(): void;
};

export type EditorActionResult =
  | { ok: true }
  /** Nothing was done: edits are still unsent, and autosave's status says why. */
  | { ok: false; reason: "unsaved" }
  | { ok: false; reason: "failed"; error: unknown };

/**
 * Put the draft on the shop.
 *
 * Autosave is flushed first and the shop is updated only if that worked with nothing left
 * waiting; otherwise the merchant is told why instead of publishing half their work. Autosave is
 * then held for the round trip, so a keystroke cannot start a save that would make the publish
 * itself a conflict — held edits are sent as a new draft the moment it is over.
 *
 * The API clears the storefront's caches and tells it to rebuild, so nothing is purged here.
 */
export async function saveToShop(ports: EditorPorts): Promise<EditorActionResult> {
  const { autosave } = ports;
  await autosave.flush();
  const before = autosave.snapshot();
  if (before.unsent) return { ok: false, reason: "unsaved" };
  try {
    const done = await autosave.hold(() => ports.publish(before.draftRevision));
    autosave.published(done.draft_revision);
    ports.themesChanged();
    ports.refreshPreview(done.preview_version);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: "failed", error };
  }
}

/**
 * Throw the draft away. The live shop does not change.
 *
 * The device copy goes with it: it holds the very edits being thrown away, so keeping it would
 * offer them back on the next visit.
 */
export function discardDraft(ports: EditorPorts): Promise<EditorActionResult> {
  return replaceDraft(ports, (expected) => ports.discard(expected));
}

/**
 * Bring a saved version back into the draft. It reaches shoppers only when the merchant saves,
 * so a restore can be looked at first and a misclick costs nothing.
 */
export function restoreVersion(ports: EditorPorts, revision: number): Promise<EditorActionResult> {
  return replaceDraft(ports, (expected) => ports.restore(revision, expected));
}

/**
 * The main answer to a clash: read the draft as it is now and edit from there. The edits this
 * editor had not sent are given up, which is what the merchant chose, so the device copy goes
 * too rather than offering them again later.
 */
export function loadLatest(ports: EditorPorts): Promise<EditorActionResult> {
  return replaceDraft(ports, () => ports.reload());
}

/**
 * The other answer to a clash: save this editor's work over the draft, at the revision the 409
 * named. It replaces the draft only — the live shop is untouched, and a Save after it is still
 * the merchant's own act.
 */
export async function keepMyVersion(
  ports: EditorPorts,
  draftRevision: number,
): Promise<EditorActionResult> {
  const { autosave } = ports;
  await autosave.resume(draftRevision);
  const after = autosave.snapshot();
  // Still unsent: the draft moved again while the merchant was choosing, or the save failed.
  if (after.unsent) return { ok: false, reason: "unsaved" };
  // The other editor may have discarded the draft, so this shop may have one again now.
  ports.themesChanged();
  return { ok: true };
}

/** What is left in the way after an action that did not work, and what the merchant is told. */
export type ActionProblem = {
  /**
   * The clash still waiting for an answer, or null. Null takes the clash question away: its two
   * answers are about a draft, and neither of them undoes a lost plan or a lost connection.
   */
  clash: { draftRevision: number | null } | null;
  /**
   * What to say: the failure's own message, or a plain sentence when nothing was sent. Null when
   * the clash question is the message.
   */
  tell: { kind: "error"; error: unknown } | { kind: "blocked" } | { kind: "blockedInvalid" } | null;
};

/**
 * What to show after an action came back. Autosave's status matters as much as the answer: an
 * action can fail because autosave had already stopped, and then the stopping reason is the true
 * one — "try again in a moment" is only honest while the sending may still come good.
 */
export function actionProblem(result: EditorActionResult, status: AutosaveStatus): ActionProblem {
  if (result.ok) return { clash: null, tell: null };
  const waiting = status.kind === "conflict" ? { draftRevision: status.draftRevision } : null;
  if (result.reason === "failed") {
    const parts = apiErrorParts(result.error);
    // The clash itself: the dialog asks the question, so nothing is said twice.
    if (parts.status === 409) return { clash: { draftRevision: parts.draftRevision ?? null }, tell: null };
    // A 403 is the end of editing (the plan lapsed, or this member may no longer edit), so a
    // clash stops being the thing in the way. Everything else is said even with one still open,
    // or a failed answer to the clash would say nothing at all.
    return { clash: parts.status === 403 ? null : waiting, tell: { kind: "error", error: result.error } };
  }
  // Nothing was sent, and autosave's status says why: a clash to answer, access gone, a part the
  // API refuses, or a send that may still come good.
  if (waiting) return { clash: waiting, tell: null };
  if (status.kind === "refused") return { clash: null, tell: { kind: "error", error: status.error } };
  return { clash: null, tell: { kind: status.kind === "invalid" ? "blockedInvalid" : "blocked" } };
}

/** What closing the editor has to ask about, once everything waiting has been sent. */
export type LeaveChoice =
  /** Nothing is waiting and there is no draft: just go. */
  | "leave"
  /** A draft is waiting: Save to shop, keep it for later, or throw it away. */
  | "askDraft"
  /** Edits could not be sent at all: they stay on this device until the merchant comes back. */
  | "askUnsaved";

export function leaveChoice(snapshot: AutosaveSnapshot): LeaveChoice {
  if (snapshot.unsent) return "askUnsaved";
  return snapshot.hasDraft ? "askDraft" : "leave";
}

/** Discard, restore and loading the latest differ only in the call: the order is one order. */
async function replaceDraft(
  ports: EditorPorts,
  call: (expectedDraftRevision: number) => Promise<ThemeEditorState>,
): Promise<EditorActionResult> {
  const { autosave } = ports;
  try {
    const state = await autosave.hold(async () => {
      // Read inside the hold: a save that was on its way has landed, so this is the revision
      // the server gave us last, not the one from before it.
      const next = await call(autosave.snapshot().draftRevision);
      ports.load(next);
      autosave.reset({
        document: next.document,
        draftRevision: next.draft_revision,
        hasDraft: next.has_draft,
      });
      ports.forgetDeviceCopy();
      return next;
    });
    ports.themesChanged();
    ports.refreshPreview(state.preview_version);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: "failed", error };
  }
}
