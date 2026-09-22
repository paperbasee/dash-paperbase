/**
 * The announcement bar, end to end on the canvas.
 *
 * This is the first place in the editor that is not a drawing: what a merchant
 * types lands in the shop's own document. The failure this guards against is
 * the quiet one -- the screen accepting a click, looking right, and writing
 * nothing -- so these assertions are about the DOCUMENT, not about the markup.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import { ShopChrome } from "@/components/theme-editor/slots/ShopChrome";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import {
  choiceEdits,
  sectionFor,
  settingEdits,
  slotValueFor,
  wiringFor,
} from "@/lib/theme-editor/slot-sections";
import type { ThemeDocument, ThemeEditorState } from "@/lib/theme-editor/api";
import { document, manifest } from "../lib/theme-editor/fixtures";
import en from "../../messages/en.json";

const NOTICE = wiringFor("header", "notice")!;

function editor(doc: ThemeDocument = document()) {
  return initEditorState({
    document: doc,
    manifest,
    draft_revision: 1,
    has_draft: false,
  } as unknown as ThemeEditorState);
}

/** A click on the bar's choices, taking the editor's own path. */
function choose(state: EditorState, value: string): EditorState {
  return choiceEdits(state.document, NOTICE, value).reduce(editorReducer, state);
}

/** A setting typed into the bar, taking the editor's own path. */
function type(state: EditorState, setting: string, value: unknown): EditorState {
  return settingEdits(state.document, NOTICE, setting, value).reduce(editorReducer, state);
}

/** The bar as the canvas draws it, from the settings the document holds. */
function drawn(doc: ThemeDocument) {
  const section = sectionFor(doc, NOTICE);
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      <ShopChrome
        page="header"
        slotKey="notice"
        variant={slotValueFor(doc, NOTICE)}
        settings={{}}
        live={section?.settings}
      />
    </NextIntlClientProvider>,
  );
}

describe("switching the bar on and off", () => {
  test("choosing the message shows the section the shop already has", () => {
    const before = editor();
    const section = sectionFor(before.document, NOTICE)!;
    expect(section.hidden).toBe(true);

    const after = choose(before, "message");

    expect(slotValueFor(after.document, NOTICE)).toBe("message");
    expect(after.changed).toBe(true);
  });

  test("choosing Off hides it rather than removing it", () => {
    // Hiding keeps the words. A merchant who switches the strip off for a week
    // and back on again must not have to type their line a second time.
    const written = type(choose(editor(), "message"), "text", "Free delivery in Dhaka");

    const off = choose(written, "off");

    expect(slotValueFor(off.document, NOTICE)).toBe("off");
    expect(sectionFor(off.document, NOTICE)?.settings.text).toBe("Free delivery in Dhaka");
  });
});

describe("what the merchant types", () => {
  test("a message reaches the document and the drawing", () => {
    const after = type(choose(editor(), "message"), "text", "Eid delivery until Thursday");

    expect(sectionFor(after.document, NOTICE)?.settings.text).toBe("Eid delivery until Thursday");
    expect(drawn(after.document)).toContain("Eid delivery until Thursday");
  });

  test("an empty message draws the example, not an empty strip", () => {
    // A bar drawn blank reads as a bug. The example says what the place is for
    // until the merchant has written their own line.
    expect(drawn(choose(editor(), "message").document)).toContain(en.themeEditor.slots.noticeExample);
  });

  test("the loaded document is never edited in place", () => {
    // The editor hands its document to autosave by identity; an edit made in
    // place would be saved as "no change" and the merchant's line would sit on
    // the screen and never reach the shop.
    const loaded = document();
    const before = JSON.stringify(loaded);

    type(choose(editor(loaded), "message"), "text", "Written");

    expect(JSON.stringify(loaded)).toBe(before);
  });
});
