/**
 * The announcement bar, end to end in the editor.
 *
 * This is the first place in the editor that is not a drawing: what a merchant
 * types lands in the shop's own document. The failure this guards against is
 * the quiet one -- the screen accepting a click, looking right, and writing
 * nothing -- so these assertions are about the DOCUMENT, not about the markup.
 *
 * Since 2026-09-25 the bar holds up to three messages that take turns, each a
 * part (`message` block) with its own words, link and icon, and can carry
 * Track order and Help -- so this file describes the bar's real shape rather
 * than the shared fixtures' made-up one, where the bar is still just "a
 * section with a text and a link" for the editor's own mechanics.
 */
import { describe, expect, test } from "vitest";

import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { addBlockEdits, blockSettingEdits, choiceEdits, sectionFor, sectionOfType, slotValueFor, wiringFor } from "@/lib/theme-editor/slot-sections";
import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";

const NOTICE = wiringFor("header", "notice")!;
const labels = (label: string) => ({ label, label_bn: `${label} (bn)` });

/** The bar as the theme declares it since `theming/0037`. */
const manifest = {
  key: "storefront",
  name: "Storefront",
  name_bn: "স্টোরফ্রন্ট",
  category: null,
  settings: [],
  sections: {
    announcement_bar: {
      ...labels("Announcement bar"),
      max_blocks: 3,
      settings: [
        { id: "quick_links", type: "boolean", ...labels("Track order and Help"), default: false },
        { id: "starts_at", type: "datetime", ...labels("Starts"), default: "" },
        { id: "ends_at", type: "datetime", ...labels("Ends"), default: "" },
      ],
      blocks: {
        message: {
          ...labels("Message"),
          settings: [
            { id: "text", type: "text", ...labels("Message"), default: "" },
            { id: "link", type: "url", ...labels("Link"), default: "" },
            { id: "link_text", type: "text", ...labels("Link text"), default: "" },
            {
              id: "icon",
              type: "select",
              ...labels("Icon"),
              options: ["none", "truck", "gift", "tag"],
              default: "none",
            },
          ],
        },
      },
    },
    header: { ...labels("Header"), at_most_one: true, required: true, settings: [] },
    footer: { ...labels("Footer"), at_most_one: true, required: true, settings: [] },
  },
  groups: {
    header: { ...labels("Header"), sections: ["announcement_bar", "header"], default: [] },
    footer: { ...labels("Footer"), sections: ["footer"], default: [] },
  },
  templates: {},
} as unknown as ThemeManifest;

const section = (id: string, type: string, over: Partial<ThemeSection> = {}): ThemeSection => ({
  id,
  type,
  hidden: false,
  settings: {},
  blocks: [],
  ...over,
});

function document(): ThemeDocument {
  return {
    theme: "storefront",
    settings: {},
    header: {
      sections: [
        section("announcement-bar", "announcement_bar", {
          hidden: true,
          settings: { quick_links: false, starts_at: "", ends_at: "" },
        }),
        section("header", "header"),
      ],
    },
    footer: { sections: [section("footer", "footer")] },
    templates: {},
  } as unknown as ThemeDocument;
}

function editor(doc: ThemeDocument = document()) {
  return initEditorState({
    document: doc,
    manifest,
    draft_revision: 1,
    has_draft: false,
  } as unknown as ThemeEditorState);
}

const run = (state: EditorState, actions: ReturnType<typeof choiceEdits>) => actions.reduce(editorReducer, state);

/** A click on the bar's choices, taking the editor's own path. */
const choose = (state: EditorState, value: string) =>
  run(state, choiceEdits(state.document, NOTICE, value, { page: "header", key: "notice" }));

/** A new message with these words, taking the editor's own path: add a part, then type into it. */
function write(state: EditorState, settings: Record<string, unknown>): EditorState {
  const before = sectionFor(state.document, NOTICE)?.blocks.length ?? 0;
  const added = run(state, addBlockEdits(state.document, NOTICE, "message"));
  const blocks = sectionFor(added.document, NOTICE)!.blocks;
  // Refused -- the bar is full -- so there is no new part to type into.
  if (blocks.length === before) return added;
  const id = blocks[blocks.length - 1].id;
  return Object.entries(settings).reduce(
    (next, [setting, value]) => run(next, blockSettingEdits(next.document, NOTICE, id, setting, value)),
    added,
  );
}

const messages = (state: EditorState) => sectionFor(state.document, NOTICE)?.blocks ?? [];

describe("switching the bar on and off", () => {
  test("choosing the message shows the section the shop already has", () => {
    const before = editor();
    // There, and hidden: `sectionFor` answers what the place is SHOWING, so it
    // is null until the merchant switches the bar on.
    expect(sectionOfType(before.document, NOTICE, "announcement_bar")!.hidden).toBe(true);
    expect(sectionFor(before.document, NOTICE)).toBeNull();

    const after = choose(before, "message");

    expect(slotValueFor(after.document, NOTICE)).toBe("message");
    expect(after.changed).toBe(true);
  });

  test("choosing Off hides it rather than removing it", () => {
    // Hiding keeps the words. A merchant who switches the strip off for a week
    // and back on again must not have to type their messages a second time.
    const written = write(choose(editor(), "message"), { text: "Free delivery in Dhaka" });

    const off = choose(written, "off");

    expect(slotValueFor(off.document, NOTICE)).toBe("off");
    const kept = sectionOfType(off.document, NOTICE, "announcement_bar")!;
    expect(kept.blocks[0].settings.text).toBe("Free delivery in Dhaka");
  });
});

describe("what the merchant writes", () => {
  test("a message reaches the document", () => {
    const after = write(choose(editor(), "message"), { text: "Eid delivery until Thursday" });

    expect(messages(after)[0].type).toBe("message");
    expect(messages(after)[0].settings.text).toBe("Eid delivery until Thursday");
  });

  test("three at most", () => {
    let state = choose(editor(), "message");
    for (const text of ["One", "Two", "Three", "Four"]) state = write(state, { text });
    expect(messages(state).map((one) => one.settings.text)).toEqual(["One", "Two", "Three"]);
  });

  test("the loaded document is never edited in place", () => {
    // The editor hands its document to autosave by identity; an edit made in
    // place would be saved as "no change" and the merchant's line would sit on
    // the screen and never reach the shop.
    const loaded = document();
    const before = JSON.stringify(loaded);

    write(choose(editor(loaded), "message"), { text: "Written" });

    expect(JSON.stringify(loaded)).toBe(before);
  });
});
