/**
 * Autosave: edits settle before a save, one save is out at a time, each save sends the revision
 * the last one returned, edits made during a save follow it, and each refusal the API documents
 * does what the merchant needs (stop on 409 and 403, wait for the next edit on 400, Retry on the rest).
 */

import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeDraftSaved } from "@/lib/theme-editor/api";
import { AUTOSAVE_DELAY_MS, createAutosave, type AutosaveSnapshot } from "@/lib/theme-editor/autosave";
import { document as baseDocument } from "./fixtures";

/** Timers that run only when the test says so. */
function manualTimers() {
  let next = 1;
  const pending = new Map<number, { run: () => void; ms: number }>();
  return {
    timers: {
      set: (run: () => void, ms: number) => {
        const id = next++;
        pending.set(id, { run, ms });
        return id;
      },
      clear: (id: unknown) => void pending.delete(id as number),
    },
    pending: () => [...pending.values()].map((p) => p.ms),
    runAll() {
      const due = [...pending.entries()];
      pending.clear();
      for (const [, p] of due) p.run();
    },
  };
}

type Call = {
  document: ThemeDocument;
  expected: number;
  resolve: (value: ThemeDraftSaved) => void;
  reject: (error: unknown) => void;
};

const httpError = (status: number, data: unknown = {}) => Object.assign(new Error(`HTTP ${status}`), { status, data });

/** Lets the promise callbacks inside the scheduler run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup({ hasDraft = false, revision = 4 } = {}) {
  const clock = manualTimers();
  const calls: Call[] = [];
  const snapshots: AutosaveSnapshot[] = [];
  const savedVersions: string[] = [];
  const autosave = createAutosave({
    document: baseDocument(),
    draftRevision: revision,
    hasDraft,
    send: (document, expected) =>
      new Promise<ThemeDraftSaved>((resolve, reject) => calls.push({ document, expected, resolve, reject })),
    onChange: (snapshot) => snapshots.push(snapshot),
    onSaved: (version) => savedVersions.push(version),
    timers: clock.timers,
  });
  const last = () => snapshots.at(-1) ?? autosave.snapshot();
  return { autosave, clock, calls, savedVersions, last };
}

/** The base document with the home page's banners hidden (or shown again). */
function edited(hidden = true, extra = 0): ThemeDocument {
  const doc = baseDocument();
  doc.templates.home.sections[0].hidden = hidden;
  doc.settings = extra ? { extra } : {};
  return doc;
}

describe("timing", () => {
  test("opens idle, or saved when a draft exists, with nothing unsent", () => {
    expect(setup().autosave.snapshot()).toEqual({ status: { kind: "idle" }, draftRevision: 4, unsent: false });
    expect(setup({ hasDraft: true }).autosave.snapshot().status).toEqual({ kind: "saved" });
  });

  test("an edit waits for the quiet period, and a burst of edits is one save", async () => {
    const { autosave, clock, calls, last } = setup();
    autosave.edit(edited(true, 1));
    autosave.edit(edited(true, 2));
    autosave.edit(edited(true, 3));
    expect(calls).toHaveLength(0);
    expect(clock.pending()).toEqual([AUTOSAVE_DELAY_MS]);
    expect(last()).toMatchObject({ status: { kind: "saving" }, unsent: true });

    clock.runAll();
    expect(calls).toHaveLength(1);
    expect(calls[0].document.settings).toEqual({ extra: 3 });
    expect(calls[0].expected).toBe(4);
  });

  test("flush sends at once", () => {
    const { autosave, calls, clock } = setup();
    autosave.edit(edited());
    void autosave.flush();
    expect(calls).toHaveLength(1);
    expect(clock.pending()).toEqual([]);
  });

  test("the same document is never sent twice, and an undone edit is not sent at all", async () => {
    const { autosave, clock, calls, last } = setup();
    autosave.edit(baseDocument());
    expect(clock.pending()).toEqual([]);
    autosave.edit(edited());
    autosave.edit(edited(false));
    clock.runAll();
    expect(calls).toHaveLength(0);
    // No draft was ever saved, so it doesn't say "Saved as draft".
    expect(last()).toMatchObject({ status: { kind: "idle" }, unsent: false });
  });

  test("an undone edit on a shop with a draft, or after a save, goes back to saved", async () => {
    const withDraft = setup({ hasDraft: true });
    withDraft.autosave.edit(edited());
    withDraft.autosave.edit(edited(false));
    withDraft.clock.runAll();
    expect(withDraft.last()).toMatchObject({ status: { kind: "saved" }, unsent: false });

    const { autosave, clock, calls, last } = setup();
    autosave.edit(edited(true, 1));
    clock.runAll();
    calls[0].resolve({ draft_revision: 5, preview_version: "aaa" });
    await settle();
    autosave.edit(edited(true, 2));
    autosave.edit(edited(true, 1));
    clock.runAll();
    expect(calls).toHaveLength(1);
    expect(last()).toMatchObject({ status: { kind: "saved" }, unsent: false });
  });
});

describe("one save at a time", () => {
  test("the revision each save returns goes with the next, and the preview hears each version", async () => {
    const { autosave, clock, calls, savedVersions, last } = setup();
    autosave.edit(edited(true, 1));
    clock.runAll();
    calls[0].resolve({ draft_revision: 5, preview_version: "aaa" });
    await settle();
    expect(last()).toEqual({ status: { kind: "saved" }, draftRevision: 5, unsent: false });

    autosave.edit(edited(true, 2));
    clock.runAll();
    expect(calls[1].expected).toBe(5);
    calls[1].resolve({ draft_revision: 6, preview_version: "bbb" });
    await settle();
    expect(savedVersions).toEqual(["aaa", "bbb"]);
  });

  test("edits during a save wait for it, then follow as one save", async () => {
    const { autosave, clock, calls, last } = setup();
    autosave.edit(edited(true, 1));
    clock.runAll();
    autosave.edit(edited(true, 2));
    autosave.edit(edited(true, 3));
    clock.runAll(); // the quiet period ends while the first save is still out
    expect(calls).toHaveLength(1);

    const done = autosave.flush();
    calls[0].resolve({ draft_revision: 5, preview_version: "aaa" });
    await settle();
    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({ expected: 5, document: { settings: { extra: 3 } } });
    expect(last()).toMatchObject({ status: { kind: "saving" }, unsent: true });

    calls[1].resolve({ draft_revision: 6, preview_version: "bbb" });
    await done;
    expect(last()).toEqual({ status: { kind: "saved" }, draftRevision: 6, unsent: false });
  });

  test("an edit still settling when a save lands keeps its quiet period", async () => {
    const { autosave, clock, calls, last } = setup();
    autosave.edit(edited(true, 1));
    clock.runAll();
    autosave.edit(edited(true, 2));
    calls[0].resolve({ draft_revision: 5, preview_version: "aaa" });
    await settle();
    expect(calls).toHaveLength(1);
    expect(last()).toMatchObject({ status: { kind: "saving" }, unsent: true });
    clock.runAll();
    expect(calls).toHaveLength(2);
  });
});

describe("refusals", () => {
  test("a network failure is Retry; nothing is lost and the next try sends the same revision", async () => {
    const { autosave, clock, calls, last } = setup();
    autosave.edit(edited());
    clock.runAll();
    calls[0].reject(new TypeError("Failed to fetch"));
    await settle();
    expect(last()).toEqual({ status: { kind: "failed" }, draftRevision: 4, unsent: true });

    void autosave.flush(); // Retry
    expect(calls).toHaveLength(2);
    expect(calls[1].expected).toBe(4);
    calls[1].resolve({ draft_revision: 5, preview_version: "aaa" });
    await settle();
    expect(last().status).toEqual({ kind: "saved" });
  });

  test("a 5xx fails the same way", async () => {
    const { autosave, clock, calls, last } = setup();
    autosave.edit(edited());
    clock.runAll();
    calls[0].reject(httpError(502));
    await settle();
    expect(last().status).toEqual({ kind: "failed" });
  });

  test("409 stops autosave: later edits and flushes send nothing", async () => {
    const { autosave, clock, calls, last } = setup();
    autosave.edit(edited(true, 1));
    clock.runAll();
    autosave.edit(edited(true, 2)); // waiting while the conflict comes back
    calls[0].reject(httpError(409, { code: "draft_conflict", draft_revision: 9 }));
    await settle();
    expect(last()).toMatchObject({ status: { kind: "conflict" }, unsent: true });
    expect(clock.pending()).toEqual([]);

    autosave.edit(edited(true, 3));
    await autosave.flush();
    clock.runAll();
    expect(calls).toHaveLength(1);
    expect(last().status).toEqual({ kind: "conflict" });
  });

  test("403 stops autosave with the answer, for the message", async () => {
    const { autosave, clock, calls, last } = setup();
    autosave.edit(edited());
    clock.runAll();
    const error = httpError(403, { code: "not_entitled" });
    calls[0].reject(error);
    await settle();
    expect(last().status).toEqual({ kind: "refused", error });
    autosave.edit(edited(true, 5));
    clock.runAll();
    expect(calls).toHaveLength(1);
  });

  test("400 invalid_document names the part and waits for the next edit", async () => {
    const { autosave, clock, calls, last } = setup();
    const bad = edited(true, 1);
    autosave.edit(bad);
    clock.runAll();
    calls[0].reject(httpError(400, { code: "invalid_document", path: "templates.home.sections[0].settings.x" }));
    await settle();
    expect(last().status).toEqual({ kind: "invalid", path: "templates.home.sections[0].settings.x", document: bad });

    // Hiding the tab or Retry does not send the refused document again.
    await autosave.flush();
    expect(calls).toHaveLength(1);

    autosave.edit(edited(true, 2));
    clock.runAll();
    expect(calls).toHaveLength(2);
  });

  test("an edit back to the refused document shows the refusal again, never Saving… for good", async () => {
    const { autosave, clock, calls, last } = setup();
    const bad = edited(true, 1);
    autosave.edit(bad);
    clock.runAll();
    const refusal = { code: "invalid_document", path: "templates.home.sections[0].settings.x" };
    calls[0].reject(httpError(400, refusal));
    await settle();

    // Hide, then show again before the quiet period ends: the refused document is back.
    autosave.edit(edited(true, 2));
    autosave.edit(bad);
    expect(last().status).toEqual({ kind: "saving" });
    clock.runAll();
    expect(calls).toHaveLength(1);
    expect(last()).toMatchObject({ status: { kind: "invalid", path: refusal.path, document: bad }, unsent: true });
  });
});
