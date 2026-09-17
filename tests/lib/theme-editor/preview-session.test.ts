/**
 * The editor's side of the preview messages (guidelines/theme-system.md, "The preview's
 * messages (for the editor)"): only its own frame at the exact origin is heard, every `ready`
 * is checked against the store being edited and a mismatch is never entered again on its own,
 * every wait times out, and recovery climbs same pass -> new pass -> unavailable, once each.
 */

import { describe, expect, test } from "vitest";

import {
  initPreviewState,
  PREVIEW_ENTER_WAIT_MS,
  PREVIEW_REFRESH_WAIT_MS,
  previewTransition,
  readPreviewMessage,
  type PreviewEffect,
  type PreviewEvent,
  type PreviewMessage,
  type PreviewState,
} from "@/lib/theme-editor/preview-session";

const ORIGIN = "https://preview.paperbase.me";
const STORE = "str_gadzilla";
const frame = { name: "the editor's frame" };

const event = (data: unknown, over: { origin?: string; source?: unknown } = {}) => ({
  origin: over.origin ?? ORIGIN,
  source: "source" in over ? over.source : frame,
  data,
});

describe("readPreviewMessage", () => {
  const ready = { type: "pb-preview:ready", storePublicId: STORE, path: "/en", version: "abc" };

  test("reads each message the contract names", () => {
    expect(readPreviewMessage(event(ready), ORIGIN, frame)).toEqual({
      type: "ready",
      storePublicId: STORE,
      path: "/en",
      version: "abc",
    });
    expect(readPreviewMessage(event({ type: "pb-preview:navigated", path: "/en/blog" }), ORIGIN, frame)).toEqual({
      type: "navigated",
      path: "/en/blog",
    });
    expect(readPreviewMessage(event({ type: "pb-preview:refreshed", version: "def" }), ORIGIN, frame)).toEqual({
      type: "refreshed",
      version: "def",
    });
    expect(
      readPreviewMessage(event({ type: "pb-preview:expired", reason: "stale_session" }), ORIGIN, frame),
    ).toEqual({ type: "expired", reason: "stale_session" });
  });

  test("ignores another origin, even one that only differs a little", () => {
    for (const origin of [
      "https://evil.example",
      "http://preview.paperbase.me",
      "https://preview.paperbase.me:444",
      "https://preview.paperbase.me.evil.example",
      "null",
    ]) {
      expect(readPreviewMessage(event(ready, { origin }), ORIGIN, frame)).toBeNull();
    }
  });

  test("ignores any window but the editor's own frame", () => {
    expect(readPreviewMessage(event(ready, { source: { name: "another frame" } }), ORIGIN, frame)).toBeNull();
    expect(readPreviewMessage(event(ready, { source: null }), ORIGIN, frame)).toBeNull();
    // No frame yet: nothing is anyone's frame.
    expect(readPreviewMessage(event(ready, { source: undefined }), ORIGIN, undefined)).toBeNull();
    expect(readPreviewMessage(event(ready, { source: null }), ORIGIN, null)).toBeNull();
  });

  test("ignores junk", () => {
    for (const data of [
      null,
      "pb-preview:ready",
      42,
      [],
      {},
      { type: "pb-preview:refresh" },
      { type: "pb-preview:ready", storePublicId: STORE, path: "/en" },
      { type: "pb-preview:ready", storePublicId: 7, path: "/en", version: "abc" },
      { type: "pb-preview:navigated" },
      { type: "pb-preview:refreshed", version: null },
      { type: "something-else", path: "/en" },
    ]) {
      expect(readPreviewMessage(event(data), ORIGIN, frame)).toBeNull();
    }
  });

  test("an unknown expiry reason reads as a bad pass", () => {
    expect(readPreviewMessage(event({ type: "pb-preview:expired", reason: "brand_new" }), ORIGIN, frame)).toEqual({
      type: "expired",
      reason: "invalid_pass",
    });
  });
});

/** Runs events in order, collecting every effect. */
function play(state: PreviewState, ...events: PreviewEvent[]) {
  const effects: PreviewEffect[] = [];
  for (const e of events) {
    const step = previewTransition(state, e);
    state = step.state;
    effects.push(...step.effects);
  }
  return { state, effects };
}

const msg = (message: PreviewMessage): PreviewEvent => ({ type: "message", message });
const ready = (over: Partial<Extract<PreviewMessage, { type: "ready" }>> = {}) =>
  msg({ type: "ready", storePublicId: STORE, path: "/en", version: "v1", ...over });
const timeout = (state: PreviewState): PreviewEvent => ({ type: "timeout", id: state.wait!.id });

/** Minted, entered and showing home at the saved version. */
function shown() {
  return play(initPreviewState(STORE, "v1"), { type: "start" }, { type: "minted", storePublicId: STORE }, ready())
    .state;
}

describe("entering", () => {
  test("start mints, a pass enters and waits 15s, ready shows it", () => {
    let step = play(initPreviewState(STORE, "v1"), { type: "start" });
    expect(step.effects).toEqual([{ type: "mint" }]);
    step = play(step.state, { type: "minted", storePublicId: STORE });
    expect(step.effects).toEqual([{ type: "enter" }]);
    expect(step.state.phase).toBe("entering");
    expect(step.state.wait?.ms).toBe(PREVIEW_ENTER_WAIT_MS);
    step = play(step.state, ready());
    expect(step.state).toMatchObject({ phase: "shown", wait: null, hasShown: true, path: "/en", rung: 0 });
    expect(step.effects).toEqual([]);
  });

  test("a ready drawn from an older draft asks for a refresh", () => {
    const entering = play(initPreviewState(STORE, "v2"), { type: "start" }, { type: "minted", storePublicId: STORE });
    const step = play(entering.state, ready({ version: "v1" }));
    expect(step.effects).toEqual([{ type: "refresh" }]);
    expect(step.state.phase).toBe("refreshing");
  });

  test("without a store id from the token, the pass names the store", () => {
    const step = play(initPreviewState("", "v1"), { type: "start" }, { type: "minted", storePublicId: STORE }, ready());
    expect(step.state.phase).toBe("shown");
  });

  test("a refused mint stops with its reason; a failed one is unavailable", () => {
    const start = play(initPreviewState(STORE, "v1"), { type: "start" }).state;
    expect(play(start, { type: "mintRefused", reason: "not_entitled" }).state).toMatchObject({
      phase: "stopped",
      stopReason: "not_entitled",
    });
    expect(play(start, { type: "mintFailed" }).state).toMatchObject({ phase: "unavailable", mintLimited: false });
  });

  test("a mint over the hourly limit says so, until a pass is minted again", () => {
    const limited = play(initPreviewState(STORE, "v1"), { type: "start" }, { type: "mintFailed", limited: true }).state;
    expect(limited).toMatchObject({ phase: "unavailable", mintLimited: true });
    const step = play(limited, { type: "reload" }, { type: "minted", storePublicId: STORE });
    expect(step.effects).toEqual([{ type: "mint" }, { type: "enter" }]);
    expect(step.state.mintLimited).toBe(false);
  });

  test("a page picked while the preview is still opening is loaded once it is in", () => {
    const entering = play(initPreviewState(STORE, "v1"), { type: "start" }, { type: "minted", storePublicId: STORE });
    const picked = play(entering.state, { type: "show", path: "/en/products/men/shirt" });
    expect(picked.effects).toEqual([]);
    expect(picked.state).toMatchObject({ phase: "entering", wantedPath: "/en/products/men/shirt" });
    const step = play(picked.state, ready({ path: "/en" }));
    expect(step.effects).toEqual([{ type: "load", path: "/en/products/men/shirt" }]);
    expect(step.state.phase).toBe("loading");
  });

  test("entering again lands on home, so the editor's page is loaded back", () => {
    let state = play(shown(), { type: "show", path: "/en/products/men/shirt" }).state;
    state = play(state, ready({ path: "/en/products/men/shirt" })).state;
    const step = play(state, { type: "reload" }, ready({ path: "/en" }));
    expect(step.effects).toEqual([{ type: "enter" }, { type: "load", path: "/en/products/men/shirt" }]);
    expect(step.state.phase).toBe("loading");
    // The loaded page is accepted wherever it lands, so a redirect cannot loop.
    const landed = play(step.state, ready({ path: "/en/products/men/shirts/shirt" }));
    expect(landed.effects).toEqual([]);
    expect(landed.state.phase).toBe("shown");
  });
});

describe("one store per browser", () => {
  test("a ready for another store stops, and is never entered again on its own", () => {
    let step = play(shown(), ready({ storePublicId: "str_other", version: "zzz" }));
    expect(step.state.phase).toBe("otherStore");
    expect(step.effects).toEqual([]);
    // Everything after it describes the other store; nothing re-enters.
    step = play(
      step.state,
      ready({ storePublicId: "str_other" }),
      msg({ type: "navigated", path: "/bn/blog" }),
      msg({ type: "refreshed", version: "zzz" }),
      msg({ type: "expired", reason: "expired_pass" }),
      msg({ type: "expired", reason: "stale_session" }),
      { type: "saved", version: "v2" },
    );
    expect(step.effects).toEqual([]);
    expect(step.state).toMatchObject({ phase: "otherStore", wait: null, path: "/en" });
  });

  test("the merchant's button enters again, and its own ready shows the store", () => {
    const other = play(shown(), ready({ storePublicId: "str_other" })).state;
    const step = play(other, { type: "reload" }, ready());
    expect(step.effects).toEqual([{ type: "enter" }]);
    expect(step.state.phase).toBe("shown");
  });
});

describe("saving and refreshing", () => {
  test("a save refreshes and waits 10s for its version", () => {
    let step = play(shown(), { type: "saved", version: "v2" });
    expect(step.effects).toEqual([{ type: "refresh" }]);
    expect(step.state.wait?.ms).toBe(PREVIEW_REFRESH_WAIT_MS);
    // An older redraw still drawing when the save landed does not end the wait.
    step = play(step.state, msg({ type: "refreshed", version: "v1" }));
    expect(step.state.phase).toBe("refreshing");
    step = play(step.state, msg({ type: "refreshed", version: "v2" }));
    expect(step.state).toMatchObject({ phase: "shown", wait: null });
  });

  test("each save restarts the wait from the last refresh", () => {
    const first = play(shown(), { type: "saved", version: "v2" }).state;
    const second = play(first, { type: "saved", version: "v3" }).state;
    expect(second.wait!.id).not.toBe(first.wait!.id);
    // The first wait's timer firing late changes nothing.
    expect(play(second, timeout(first)).state).toBe(second);
  });

  test("a frame that answered, just at another version, is alive when the wait ends", () => {
    const state = play(shown(), { type: "saved", version: "v2" }, msg({ type: "refreshed", version: "" })).state;
    const step = play(state, timeout(state));
    expect(step.effects).toEqual([]);
    expect(step.state.phase).toBe("shown");
  });

  test("a save while entering is drawn by the ready that follows", () => {
    const entering = play(initPreviewState(STORE, "v1"), { type: "start" }, { type: "minted", storePublicId: STORE });
    const step = play(entering.state, { type: "saved", version: "v2" });
    expect(step.effects).toEqual([]);
    expect(play(step.state, ready({ version: "v2" })).state.phase).toBe("shown");
  });

  test("the page picker loads a page and waits for its ready", () => {
    const step = play(shown(), { type: "show", path: "/en/blog" });
    expect(step.effects).toEqual([{ type: "load", path: "/en/blog" }]);
    expect(step.state).toMatchObject({ phase: "loading", wantedPath: "/en/blog" });
  });

  test("moving inside the frame is where the editor comes back to", () => {
    const state = play(shown(), msg({ type: "navigated", path: "/en/categories/men" })).state;
    expect(state).toMatchObject({ path: "/en/categories/men", wantedPath: "/en/categories/men", phase: "shown" });
  });
});

describe("recovery", () => {
  test("silence after a refresh: same pass, then a new pass, then unavailable", () => {
    let state = play(shown(), { type: "saved", version: "v2" }).state;

    let step = play(state, timeout(state));
    expect(step.effects).toEqual([{ type: "enter" }]);
    expect(step.state).toMatchObject({ phase: "entering", rung: 1 });
    state = step.state;

    step = play(state, timeout(state));
    expect(step.effects).toEqual([{ type: "mint" }]);
    expect(step.state).toMatchObject({ phase: "minting", rung: 2 });

    step = play(step.state, { type: "minted", storePublicId: STORE });
    expect(step.effects).toEqual([{ type: "enter" }]);
    state = step.state;

    step = play(state, timeout(state));
    expect(step.effects).toEqual([]);
    expect(step.state).toMatchObject({ phase: "unavailable", wait: null });
  });

  test("an answer puts recovery back at the start", () => {
    const state = play(shown(), { type: "saved", version: "v2" }).state;
    const back = play(state, timeout(state), ready({ version: "v2" })).state;
    expect(back).toMatchObject({ phase: "shown", rung: 0 });
  });

  test("expired_pass and invalid_pass mint a new pass, once", () => {
    for (const reason of ["expired_pass", "invalid_pass"] as const) {
      let step = play(shown(), msg({ type: "expired", reason }));
      expect(step.effects).toEqual([{ type: "mint" }]);
      // `expired` can repeat while the pass is on its way.
      step = play(step.state, msg({ type: "expired", reason }));
      expect(step.effects).toEqual([]);
      step = play(step.state, { type: "minted", storePublicId: STORE }, msg({ type: "expired", reason }));
      expect(step.effects).toEqual([{ type: "enter" }]);
      expect(step.state.phase).toBe("unavailable");
    }
  });

  test("stale_session enters again with the same pass first", () => {
    let step = play(shown(), msg({ type: "expired", reason: "stale_session" }));
    expect(step.effects).toEqual([{ type: "enter" }]);
    expect(step.state.rung).toBe(1);
    step = play(step.state, msg({ type: "expired", reason: "stale_session" }));
    expect(step.effects).toEqual([{ type: "mint" }]);
  });

  test("not_allowed and not_entitled stop and never retry", () => {
    for (const reason of ["not_allowed", "not_entitled"] as const) {
      let step = play(shown(), msg({ type: "expired", reason }));
      expect(step.effects).toEqual([]);
      expect(step.state).toMatchObject({ phase: "stopped", stopReason: reason, wait: null });
      step = play(
        step.state,
        { type: "reload" },
        { type: "saved", version: "v9" },
        msg({ type: "expired", reason: "expired_pass" }),
      );
      expect(step.effects).toEqual([]);
      expect(step.state.phase).toBe("stopped");
    }
  });

  test("Reload preview enters with the pass it has, or mints when there is none", () => {
    const unavailable = play(initPreviewState(STORE, "v1"), { type: "start" }, { type: "mintFailed" }).state;
    expect(play(unavailable, { type: "reload" }).effects).toEqual([{ type: "mint" }]);
    const step = play(shown(), { type: "reload" });
    expect(step.effects).toEqual([{ type: "enter" }]);
    expect(step.state.wait?.ms).toBe(PREVIEW_ENTER_WAIT_MS);
  });
});
