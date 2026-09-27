/**
 * The product card style: a theme SETTING, edited in the editor.
 *
 * It was a column, set by a picker in Settings -> Customization that took
 * effect the instant it was clicked, while every other look decision in the
 * editor waits for Save to store. Owner, 2026-09-23: "move the product card
 * functionality to the theme editor, not in the outside."
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { CARD_STYLES, CORNERS } from "@/components/theme-editor/slots/style-catalogue";

const labels = (label: string) => ({ label, label_bn: `${label} (bn)` });

const manifest: ThemeManifest = {
  key: "storefront",
  name: "Storefront",
  name_bn: "স্টোরফ্রন্ট",
  category: null,
  settings: [
    {
      id: "corner_style",
      type: "select",
      ...labels("Corners"),
      options: ["square", "soft", "rounded"],
      option_labels: {
        square: { en: "Square", bn: "চোকো" },
        soft: { en: "Soft", bn: "হালকা গোল" },
        rounded: { en: "Rounded", bn: "গোল" },
      },
      default: "soft",
    },
    {
      id: "card_style",
      type: "select",
      ...labels("Product cards"),
      options: ["classic", "shelf"],
      option_labels: {
        classic: { en: "Classic", bn: "ক্ল্যাসিক" },
        shelf: { en: "Shelf", bn: "শেলফ" },
      },
      default: "shelf",
    },
  ],
  sections: {
    header: { ...labels("Header"), at_most_one: true, required: true, settings: [] },
    footer: { ...labels("Footer"), at_most_one: true, required: true, settings: [] },
  },
  groups: {
    header: { ...labels("Header"), sections: ["header"], default: [] },
    footer: { ...labels("Footer"), sections: ["footer"], default: [] },
  },
  templates: { home: { ...labels("Home"), sections: [], default: [] } },
} as unknown as ThemeManifest;

function editor(cardStyle = "classic"): EditorState {
  return initEditorState({
    document: {
      theme: "storefront",
      settings: { card_style: cardStyle },
      header: { sections: [] },
      footer: { sections: [] },
      templates: { home: { sections: [] } },
    } as unknown as ThemeDocument,
    manifest,
    draft_revision: 1,
    has_draft: false,
  } as unknown as ThemeEditorState);
}

const pick = (state: EditorState, value: unknown) =>
  editorReducer(state, { type: "setThemeSetting", setting: "card_style", value });

describe("choosing the card style in the editor", () => {
  test("it lands in the document, where Save to store can find it", () => {
    const after = pick(editor(), "shelf");
    expect(after.document.settings.card_style).toBe("shelf");
    // Which is what marks the draft dirty, so autosave carries it.
    expect(after.changed).toBe(true);
  });

  test("a style the theme does not offer changes nothing", () => {
    const before = editor();
    expect(pick(before, "carousel")).toBe(before);
    expect(pick(before, 7)).toBe(before);
  });

  test("the panel offers exactly what the theme does", () => {
    const offered = manifest.settings.find((one) => one.id === "card_style")!.options;
    expect(CARD_STYLES.map((one) => one.key)).toEqual(offered);
  });

  test("a design that says nothing is Shelf, as the theme and the shop both draw it", () => {
    // Owner, 2026-09-27: "every shop will use shelf product card by default".
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const editorSource = fs.readFileSync(
      path.join(root, "src/components/theme-editor/slots/SlotEditor.tsx"),
      "utf8",
    );
    expect(editorSource).toMatch(/state\.document\.settings\.card_style\s*:\s*"shelf";/);
    const theme = path.resolve(root, "../api-paperbase/engine/apps/theming/themes/storefront.json");
    if (fs.existsSync(theme)) {
      const settings: { id: string; default?: unknown }[] = JSON.parse(fs.readFileSync(theme, "utf8")).settings;
      expect(settings.find((one) => one.id === "card_style")?.default).toBe("shelf");
    }
  });

  test("it is a theme setting, so no page has to be picked first", () => {
    /*
      Cards are drawn on the home page, a category, search, a brand. Every
      SECTION edit begins by picking the page it belongs to; this one belongs
      to the shop.
    */
    const state = editor();
    const after = pick(state, "shelf");
    expect(after.page).toBe(state.page);
  });
});

describe("choosing the corners in the editor", () => {
  const corner = (state: EditorState, value: unknown) =>
    editorReducer(state, { type: "setThemeSetting", setting: "corner_style", value });

  test("it lands in the document, like the card style", () => {
    const after = corner(editor(), "rounded");
    expect(after.document.settings.corner_style).toBe("rounded");
    expect(after.changed).toBe(true);
  });

  test("a corner the theme does not offer changes nothing", () => {
    const before = editor();
    expect(corner(before, "pill")).toBe(before);
  });

  test("the tiles offer exactly the theme's own values", () => {
    /*
      The keys ARE the stored values. `round` was a tile here while the theme
      said `rounded`, which would have been a click that changed nothing and
      said nothing -- the API's own `CornerStyleTests` pins the other side.
    */
    expect(CORNERS.map((one) => one.key)).toEqual(["square", "soft", "rounded"]);
  });

  test("and the tile's drawing matches the corner the shop really draws", () => {
    // 0, 6, 14 -- the large radius of each scale in `storefront/looks.py`.
    expect(CORNERS.map((one) => one.radius)).toEqual([0, 6, 14]);
  });
});
