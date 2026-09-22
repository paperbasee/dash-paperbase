/**
 * The order each whole-theme action runs in: Save sends what is waiting before it publishes and
 * stops when that failed; Discard, Restore and Load latest drop the waiting save, wait for the one
 * already out, and replace the screen, the manifest and the device copy together; Keep my version
 * saves at the revision the server named.
 */

import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemePublished } from "@/lib/theme-editor/api";
import { createAutosave, type AutosaveSnapshot, type AutosaveStatus } from "@/lib/theme-editor/autosave";
import {
  actionProblem,
  discardDraft,
  keepMyVersion,
  leaveChoice,
  loadLatest,
  saveToShop,
  type EditorPorts,
} from "@/lib/theme-editor/editor-actions";
import { document as baseDocument, manifest } from "./fixtures";

const httpError = (status: number, data: unknown = {}) =>
  Object.assign(new Error(`HTTP ${status}`), { status, data });

/** Lets the promise callbacks inside the scheduler run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function manualTimers() {
  let next = 1;
  const pending = new Map<number, () => void>();
  return {
    timers: {
      set: (run: () => void) => {
        const id = next++;
        pending.set(id, run);
        return id;
      },
      clear: (id: unknown) => void pending.delete(id as number),
    },
    waiting: () => pending.size,
    runAll() {
      const due = [...pending.values()];
      pending.clear();
      for (const run of due) run();
    },
  };
}

/** The base document with the home page's banners hidden, and a marker to tell edits apart. */
function edited(extra: number): ThemeDocument {
  const doc = baseDocument();
  doc.templates.home.sections[0].hidden = true;
  doc.settings = { extra };
  return doc;
}

function editorState(over: Partial<ThemeEditorState> = {}): ThemeEditorState {
  return {
    theme_key: "basic",
    is_live: true,
    has_draft: false,
    draft_revision: 9,
    revision: 3,
    published_at: "2026-09-14T09:40:00Z",
    published_by_name: "Rahim",
    manifest_version: "v1",
    preview_version: "after-load",
    document: baseDocument(),
    manifest,
    ...over,
  };
}

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void };

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup({ hasDraft = true, draftRevision = 4 } = {}) {
  const clock = manualTimers();
  const saves: { document: ThemeDocument; expected: number; done: Deferred<void> }[] = [];
  const log: string[] = [];
  const snapshots: AutosaveSnapshot[] = [];

  const autosave = createAutosave({
    document: baseDocument(),
    draftRevision,
    hasDraft,
    send: (document, expected) => {
      const done = deferred<void>();
      saves.push({ document, expected, done });
      log.push(`save(${expected})`);
      // Every save answers with the next revision unless the test rejects it.
      return done.promise.then(() => ({
        draft_revision: draftRevision + saves.length,
        preview_version: `v${saves.length}`,
      }));
    },
    onChange: (snapshot) => snapshots.push(snapshot),
    onSaved: (version) => log.push(`preview(${version})`),
    timers: clock.timers,
  });

  const calls: {
    publish?: Deferred<ThemePublished>;
    editorState?: Deferred<ThemeEditorState>;
  } = {};

  const ports: EditorPorts = {
    autosave,
    publish: (expected) => {
      log.push(`publish(${expected})`);
      calls.publish = deferred<ThemePublished>();
      return calls.publish.promise;
    },
    discard: (expected) => {
      log.push(`discard(${expected})`);
      calls.editorState = deferred<ThemeEditorState>();
      return calls.editorState.promise;
    },
    reload: () => {
      log.push("reload");
      calls.editorState = deferred<ThemeEditorState>();
      return calls.editorState.promise;
    },
    load: (state) => log.push(`load(${state.preview_version})`),
    refreshPreview: (version) => log.push(`refresh(${version})`),
    forgetDeviceCopy: () => log.push("forgetCopy"),
    themesChanged: () => log.push("themesChanged"),
  };

  return { autosave, ports, clock, saves, calls, log, snapshots };
}

describe("save to shop", () => {
  test("sends what is waiting first, then publishes at the revision that save returned", async () => {
    const { autosave, ports, saves, calls, log } = setup();
    autosave.edit(edited(1));

    const result = saveToShop(ports);
    await settle();
    // Flushed at once: no waiting for the quiet period.
    expect(saves).toHaveLength(1);
    saves[0].done.resolve();
    await settle();

    expect(log).toEqual(["save(4)", "preview(v1)", "publish(5)"]);
    calls.publish!.resolve({
      revision: 4,
      published_at: "2026-09-18T10:00:00Z",
      draft_revision: 6,
      preview_version: "live",
    });
    expect(await result).toEqual({ ok: true });
    expect(log).toEqual([
      "save(4)",
      "preview(v1)",
      "publish(5)",
      "themesChanged",
      "refresh(live)",
    ]);
    // No draft left, and nothing of the merchant's is unsent.
    expect(autosave.snapshot()).toMatchObject({ hasDraft: false, unsent: false, draftRevision: 6 });
    expect(autosave.snapshot().status).toEqual({ kind: "idle" });
  });

  test("a failed save stops it: nothing is published", async () => {
    const { autosave, ports, saves, log } = setup();
    autosave.edit(edited(1));
    const result = saveToShop(ports);
    await settle();
    saves[0].done.reject(new TypeError("Failed to fetch"));

    expect(await result).toEqual({ ok: false, reason: "unsaved" });
    expect(log).toEqual(["save(4)"]);
    expect(autosave.snapshot()).toMatchObject({ unsent: true, status: { kind: "failed" } });
  });

  test("a save stopped by a clash stops it too, with the clash still to answer", async () => {
    const { autosave, ports, saves, log } = setup();
    autosave.edit(edited(1));
    const result = saveToShop(ports);
    await settle();
    saves[0].done.reject(httpError(409, { code: "draft_conflict", draft_revision: 12 }));

    expect(await result).toEqual({ ok: false, reason: "unsaved" });
    expect(log).toEqual(["save(4)"]);
    expect(autosave.snapshot().status).toEqual({ kind: "conflict", draftRevision: 12 });
  });

  test("an edit made while the shop is being updated waits, then saves as a new draft", async () => {
    const { autosave, ports, saves, calls, clock, log } = setup();
    const result = saveToShop(ports);
    await settle();
    // Nothing was waiting, so the publish went straight out.
    expect(log).toEqual(["publish(4)"]);

    autosave.edit(edited(2));
    // Held: a save now would bump the draft and make the publish itself a clash.
    expect(saves).toHaveLength(0);
    expect(clock.waiting()).toBe(0);

    calls.publish!.resolve({
      revision: 4,
      published_at: "2026-09-18T10:00:00Z",
      draft_revision: 5,
      preview_version: "live",
    });
    expect(await result).toEqual({ ok: true });
    expect(autosave.snapshot()).toMatchObject({ unsent: true, hasDraft: false });

    // The wait starts again the moment the publish is over, at the revision it returned.
    expect(clock.waiting()).toBe(1);
    clock.runAll();
    expect(saves[0].expected).toBe(5);
    expect(saves[0].document.settings).toEqual({ extra: 2 });
  });

  test("a publish that fails says so and leaves the draft alone", async () => {
    const { autosave, ports, calls } = setup();
    const result = saveToShop(ports);
    await settle();
    const error = httpError(429);
    calls.publish!.reject(error);

    expect(await result).toEqual({ ok: false, reason: "failed", error });
    expect(autosave.snapshot()).toMatchObject({ hasDraft: true, draftRevision: 4 });
  });
});

describe("discard, restore and load latest", () => {
  test("the waiting save is dropped and the one already out is awaited first", async () => {
    const { autosave, ports, saves, calls, clock, log } = setup();
    autosave.edit(edited(1));
    void autosave.flush(); // one save is out
    expect(saves).toHaveLength(1);
    autosave.edit(edited(2)); // and another edit is waiting for quiet
    expect(clock.waiting()).toBe(1);

    const result = discardDraft(ports);
    await settle();
    // The waiting edit is gone and the discard has not gone out yet.
    expect(clock.waiting()).toBe(0);
    expect(log).toEqual(["save(4)"]);

    saves[0].done.resolve();
    await settle();
    // The save landed first, so the discard carries the revision it returned, not 4.
    expect(log).toEqual(["save(4)", "preview(v1)", "discard(5)"]);
    expect(saves).toHaveLength(1);

    calls.editorState!.resolve(editorState({ draft_revision: 6, has_draft: false }));
    expect(await result).toEqual({ ok: true });
    expect(log).toEqual([
      "save(4)",
      "preview(v1)",
      "discard(5)",
      "load(after-load)",
      "forgetCopy",
      "themesChanged",
      "refresh(after-load)",
    ]);
    // The screen is the server's document again: nothing unsent, no draft, no leftover save.
    expect(autosave.snapshot()).toEqual({
      status: { kind: "idle" },
      draftRevision: 6,
      unsent: false,
      hasDraft: false,
    });
    expect(clock.waiting()).toBe(0);
  });

  test("load latest reads the editor again and gives up this editor's unsent edits", async () => {
    const { autosave, ports, saves, calls, log } = setup();
    autosave.edit(edited(3));
    const result = loadLatest(ports);
    await settle();
    expect(saves).toHaveLength(0);
    expect(log).toEqual(["reload"]);

    calls.editorState!.resolve(editorState({ draft_revision: 20, has_draft: true }));
    expect(await result).toEqual({ ok: true });
    expect(log).toContain("forgetCopy");
    expect(autosave.snapshot()).toMatchObject({ unsent: false, draftRevision: 20 });
  });

  test("a failure leaves the screen alone, and this editor's edits save themselves after all", async () => {
    const { autosave, ports, calls, clock, log, saves } = setup();
    autosave.edit(edited(4));
    const result = discardDraft(ports);
    await settle();
    const error = httpError(409, { code: "draft_conflict", draft_revision: 31 });
    calls.editorState!.reject(error);

    expect(await result).toEqual({ ok: false, reason: "failed", error });
    expect(log).toEqual(["discard(4)"]);
    expect(autosave.snapshot().unsent).toBe(true);
    // The wait was started again, so the edit is not stranded.
    expect(clock.waiting()).toBe(1);
    clock.runAll();
    expect(saves).toHaveLength(1);
  });
});

describe("keep my version", () => {
  test("saves the document again at the revision the clash named", async () => {
    const { autosave, ports, saves, log } = setup();
    autosave.edit(edited(5));
    void autosave.flush();
    saves[0].done.reject(httpError(409, { code: "draft_conflict", draft_revision: 30 }));
    await settle();
    expect(autosave.snapshot().status).toEqual({ kind: "conflict", draftRevision: 30 });

    const result = keepMyVersion(ports, 30);
    await settle();
    expect(saves[1].expected).toBe(30);
    expect(saves[1].document.settings).toEqual({ extra: 5 });

    saves[1].done.resolve();
    expect(await result).toEqual({ ok: true });
    expect(autosave.snapshot()).toMatchObject({ unsent: false, hasDraft: true });
    expect(log).toContain("themesChanged");
  });

  test("a document the server already has is sent anyway: the draft there is someone else's", async () => {
    const { autosave, ports, saves } = setup();
    const result = keepMyVersion(ports, 30);
    await settle();
    expect(saves).toHaveLength(1);
    expect(saves[0].expected).toBe(30);

    saves[0].done.resolve();
    expect(await result).toEqual({ ok: true });
  });

  test("a clash again leaves it unanswered, with the newer revision to choose from", async () => {
    const { autosave, ports, saves } = setup();
    autosave.edit(edited(6));
    const result = keepMyVersion(ports, 30);
    await settle();
    saves[0].done.reject(httpError(409, { code: "draft_conflict", draft_revision: 31 }));

    expect(await result).toEqual({ ok: false, reason: "unsaved" });
    expect(autosave.snapshot().status).toEqual({ kind: "conflict", draftRevision: 31 });
  });
});

describe("leaving", () => {
  const snapshot = (over: Partial<AutosaveSnapshot>): AutosaveSnapshot => ({
    status: { kind: "idle" },
    draftRevision: 4,
    unsent: false,
    hasDraft: false,
    ...over,
  });

  test("nothing waiting and no draft: just go", () => {
    expect(leaveChoice(snapshot({}))).toBe("leave");
  });

  test("a draft is waiting: ask what it should do", () => {
    expect(leaveChoice(snapshot({ hasDraft: true }))).toBe("askDraft");
  });

  test("edits that could not be sent: warn that they stay on this device", () => {
    expect(leaveChoice(snapshot({ unsent: true, hasDraft: true }))).toBe("askUnsaved");
    expect(leaveChoice(snapshot({ unsent: true }))).toBe("askUnsaved");
  });
});

describe("what a failed action leaves", () => {
  const conflict: AutosaveStatus = { kind: "conflict", draftRevision: 30 };

  test("nothing to say when it worked", () => {
    expect(actionProblem({ ok: true }, { kind: "saved" })).toEqual({ clash: null, tell: null });
  });

  test("a 409 from the action itself is the clash, and the dialog is the message", () => {
    const result = { ok: false, reason: "failed", error: httpError(409, { code: "draft_conflict", draft_revision: 12 }) } as const;
    expect(actionProblem(result, { kind: "saved" })).toEqual({ clash: { draftRevision: 12 }, tell: null });
  });

  test("a save autosave could not send because of a clash asks the clash, from its own status", () => {
    expect(actionProblem({ ok: false, reason: "unsaved" }, conflict)).toEqual({
      clash: { draftRevision: 30 },
      tell: null,
    });
  });

  test("an answer to the clash that failed on its own says why, with the clash still open", () => {
    const error = httpError(500, "<html>");
    expect(actionProblem({ ok: false, reason: "failed", error }, conflict)).toEqual({
      clash: { draftRevision: 30 },
      tell: { kind: "error", error },
    });
  });

  test("a 403 ends editing, so the clash question goes and the reason is said", () => {
    const error = httpError(403, { code: "storefront_unavailable", reason: "expired" });
    expect(actionProblem({ ok: false, reason: "failed", error }, conflict)).toEqual({
      clash: null,
      tell: { kind: "error", error },
    });
  });

  test("autosave stopped by a 403 says that, not try again in a moment", () => {
    const error = httpError(403, { detail: "You do not have permission to perform this action." });
    expect(actionProblem({ ok: false, reason: "unsaved" }, { kind: "refused", error })).toEqual({
      clash: null,
      tell: { kind: "error", error },
    });
  });

  test("a part the API refuses is its own sentence; a send that may still come good is the plain one", () => {
    const invalid: AutosaveStatus = { kind: "invalid", path: "templates.home.sections[1]", document: baseDocument() };
    expect(actionProblem({ ok: false, reason: "unsaved" }, invalid).tell).toEqual({ kind: "blockedInvalid" });
    expect(actionProblem({ ok: false, reason: "unsaved" }, { kind: "failed" }).tell).toEqual({ kind: "blocked" });
    expect(actionProblem({ ok: false, reason: "unsaved" }, { kind: "saving" }).tell).toEqual({ kind: "blocked" });
  });
});
