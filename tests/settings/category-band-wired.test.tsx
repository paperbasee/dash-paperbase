/**
 * The category band in the editor: picture tiles, or a row of names.
 *
 * The first place where two of its choices are the SAME section shaped
 * differently -- one `category_tiles` with `layout` set one way or the other.
 * Two sections would let a merchant put both bands on the page, which is not a
 * choice anybody wants to have made by accident.
 *
 * What that costs is a rule the other places did not need: reading the place's
 * value means matching the section's settings, not only finding the section.
 */
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import {
  choiceEdits,
  meaningOf,
  placeFor,
  sectionFor,
  sectionOfType,
  sectionTypesOf,
  settingEdits,
  slotValueFor,
  wiringFor,
} from "@/lib/theme-editor/slot-sections";

const BAND = wiringFor("home", "categories")!;
const labels = (label: string) => ({ label, label_bn: `${label} (bn)` });

const manifest: ThemeManifest = {
  key: "storefront",
  name: "Storefront",
  name_bn: "স্টোরফ্রন্ট",
  category: null,
  settings: [],
  sections: {
    category_tiles: {
      ...labels("Shop by category"),
      settings: [
        {
          id: "layout",
          type: "select",
          ...labels("Shape"),
          options: ["tiles", "strip"],
          default: "tiles",
        },
        { id: "heading", type: "text", ...labels("Heading"), default: "" },
      ],
    },
    banner_slider: { ...labels("Banners"), settings: [] },
    category_products: { ...labels("Product bands"), settings: [] },
    header: { ...labels("Header"), at_most_one: true, required: true, settings: [] },
    footer: { ...labels("Footer"), at_most_one: true, required: true, settings: [] },
  },
  groups: {
    header: { ...labels("Header"), sections: ["header"], default: [] },
    footer: { ...labels("Footer"), sections: ["footer"], default: [] },
  },
  templates: {
    home: {
      ...labels("Home"),
      sections: ["banner_slider", "category_tiles", "category_products"],
      default: [],
    },
  },
} as unknown as ThemeManifest;

const section = (id: string, type: string, over: Partial<ThemeSection> = {}): ThemeSection => ({
  id,
  type,
  hidden: false,
  settings: {},
  blocks: [],
  ...over,
});

function editor(sections: ThemeSection[]): EditorState {
  return initEditorState({
    document: {
      theme: "storefront",
      settings: {},
      header: { sections: [section("header", "header")] },
      footer: { sections: [section("footer", "footer")] },
      templates: { home: { sections } },
    } as unknown as ThemeDocument,
    manifest,
    draft_revision: 1,
    has_draft: false,
  } as unknown as ThemeEditorState);
}

const band = (layout: string, over: Partial<ThemeSection> = {}) =>
  section("cats", "category_tiles", { settings: { layout, heading: "" }, ...over });

const choose = (state: EditorState, value: string) =>
  choiceEdits(state.document, BAND, value, { page: "home", key: "categories" }).reduce(editorReducer, state);
const type = (state: EditorState, setting: string, value: unknown) =>
  settingEdits(state.document, BAND, setting, value).reduce(editorReducer, state);

const layoutOf = (state: EditorState) =>
  sectionOfType(state.document, BAND, "category_tiles")?.settings.layout;

describe("what the place says it is", () => {
  test("one section, two shapes", () => {
    expect(sectionTypesOf(BAND)).toEqual(["category_tiles"]);
    expect(meaningOf(BAND, "tiles")).toEqual({
      type: "category_tiles",
      settings: { layout: "tiles" },
    });
    expect(meaningOf(BAND, "strip")?.settings).toEqual({ layout: "strip" });
  });

  test("the shape is what tells the two values apart", () => {
    expect(slotValueFor(editor([band("tiles")]).document, BAND)).toBe("tiles");
    expect(slotValueFor(editor([band("strip")]).document, BAND)).toBe("strip");
  });

  test("a hidden band reads as off, whatever shape it was", () => {
    const hidden = editor([band("strip", { hidden: true })]);
    expect(slotValueFor(hidden.document, BAND)).toBe("off");
    expect(sectionFor(hidden.document, BAND)).toBeNull();
  });

  test("a document that has no band at all reads as off", () => {
    expect(slotValueFor(editor([]).document, BAND)).toBe("off");
  });

  test("a band written before the shape existed reads as the theme's default", () => {
    // Every document written before today is this one. It must read as the
    // shape the storefront will draw for it, not as neither value.
    const older = editor([section("cats", "category_tiles", { settings: { heading: "" } })]);
    expect(slotValueFor(older.document, BAND)).toBe("tiles");
  });
});

describe("changing it", () => {
  test("choosing the row of names reshapes the band it already has", () => {
    const after = choose(editor([band("tiles")]), "strip");

    expect(layoutOf(after)).toBe("strip");
    // One band, not two: a second section would put both on the page.
    expect(after.document.templates.home.sections.filter((s) => s.type === "category_tiles")).toHaveLength(1);
  });

  test("switching it off hides the band and keeps its words", () => {
    const written = type(choose(editor([band("tiles")]), "tiles"), "heading", "Shop by category");

    const off = choose(written, "off");

    expect(slotValueFor(off.document, BAND)).toBe("off");
    const kept = sectionOfType(off.document, BAND, "category_tiles")!;
    expect(kept.hidden).toBe(true);
    expect(kept.settings.heading).toBe("Shop by category");
  });

  test("the band lands under the hero, not below everything", () => {
    /*
      The editor's order IS the page order -- that is the whole idea of the slot
      design. `add` put a new section at the end until 2026-09-22, which was
      right while a merchant could drag it afterwards and simply wrong once
      nothing drags: the owner clicked the band and found it under their
      footer's worth of product rows.
    */
    const page = editor([
      section("hero", "banner_slider"),
      section("bands", "category_products"),
    ]);

    const after = choose(page, "tiles");

    expect(after.document.templates.home.sections.map((s) => s.type)).toEqual([
      "banner_slider",
      "category_tiles",
      "category_products",
    ]);
  });

  test("a page with no hero yet puts it first", () => {
    const after = choose(editor([section("bands", "category_products")]), "tiles");
    expect(after.document.templates.home.sections[0].type).toBe("category_tiles");
  });

  test("where it goes is the editor's order, not a number written here", () => {
    // `placeFor` reads the slot catalogue, so a place that moves in the editor's list
    // moves on the page without anybody remembering to change a second list.
    const page = editor([section("hero", "banner_slider")]);
    expect(placeFor(page.document, "home", "categories", BAND)).toBe(1);
    expect(placeFor(page.document, "home", "hero", wiringFor("home", "hero")!)).toBe(0);
  });

  test("a page with no band gets one already in the shape that was asked for", () => {
    // Added AND shaped in one action: a merchant choosing the row of names must
    // not watch the tiles appear first.
    const after = choose(editor([]), "strip");

    expect(slotValueFor(after.document, BAND)).toBe("strip");
    expect(layoutOf(after)).toBe("strip");
  });

  test("the heading is the merchant's own words", () => {
    const after = type(editor([band("tiles")]), "heading", "Shop by category");
    expect(sectionFor(after.document, BAND)?.settings.heading).toBe("Shop by category");
  });

  test("the loaded document is never edited in place", () => {
    const sections = [band("tiles")];
    const loaded = {
      theme: "storefront",
      settings: {},
      header: { sections: [section("header", "header")] },
      footer: { sections: [section("footer", "footer")] },
      templates: { home: { sections } },
    } as unknown as ThemeDocument;
    const before = JSON.stringify(loaded);

    const state = initEditorState({
      document: loaded,
      manifest,
      draft_revision: 1,
      has_draft: false,
    } as unknown as ThemeEditorState);
    choose(state, "strip");

    expect(JSON.stringify(loaded)).toBe(before);
  });
});
