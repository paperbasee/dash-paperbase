/**
 * The editor's state: pick a page, add, hide, show, move and remove, with every refused
 * edit leaving the state untouched, and "changed" true only while the document differs
 * from the one loaded.
 */

import { describe, expect, test } from "vitest";

import type { ThemeDocument } from "@/lib/theme-editor/api";
import { pageSections } from "@/lib/theme-editor/document-ops";
import {
  editorReducer,
  initEditorState,
  type EditorAction,
  type EditorState,
} from "@/lib/theme-editor/editor-reducer";
import { MAX_SECTIONS_PER_LIST } from "@/lib/theme-editor/rules";
import { document, manifest, section } from "./fixtures";

const start = (page?: Parameters<typeof initEditorState>[1]) =>
  initEditorState({ document: document(), manifest }, page);

const run = (state: EditorState, ...actions: EditorAction[]) => actions.reduce(editorReducer, state);

const ids = (state: EditorState) => pageSections(state.document, state.page).map((s) => s.id);

describe("load and pages", () => {
  test("opens on the home page, unchanged", () => {
    const state = start();
    expect(state.page).toBe("templates.home");
    expect(state.changed).toBe(false);
    expect(state.saved).toBe(state.document);
  });

  test("opens on the first page when the theme has no home page", () => {
    const { home: _home, ...templates } = manifest.templates;
    expect(initEditorState({ document: document(), manifest: { ...manifest, templates } }).page).toBe(
      "templates.product",
    );
  });

  test("picking a page the theme lacks stays put", () => {
    const state = start("footer");
    expect(editorReducer(state, { type: "pickPage", page: "templates.cart" })).toBe(state);
    expect(run(state, { type: "pickPage", page: "templates.product" }).page).toBe("templates.product");
  });

  test("a reload replaces the document, clears changes and keeps the page", () => {
    const edited = run(start("templates.product"), { type: "add", sectionType: "rich_text" });
    expect(edited.changed).toBe(true);
    const reloaded = run(edited, { type: "load", document: document(), manifest });
    expect(reloaded.changed).toBe(false);
    expect(reloaded.page).toBe("templates.product");
    expect(ids(reloaded)).toEqual(["product-gallery", "product-details"]);
  });
});

describe("add", () => {
  test("appends a shown section with a fresh id", () => {
    const state = run(start(), { type: "add", sectionType: "rich_text" }, { type: "add", sectionType: "rich_text" });
    expect(ids(state)).toEqual(["banner-slider", "rich-text", "rich-text-2"]);
    expect(pageSections(state.document, "templates.home")[1]).toEqual(
      section("rich-text", "rich_text", { settings: { align: "center" } }),
    );
    expect(state.changed).toBe(true);
  });

  test("refuses a section the page does not allow, a second shown single-use one, and a full list", () => {
    const home = start();
    expect(editorReducer(home, { type: "add", sectionType: "product_gallery" })).toBe(home);

    const product = start("templates.product");
    expect(editorReducer(product, { type: "add", sectionType: "product_details" })).toBe(product);

    let full = product;
    for (let i = 0; i < MAX_SECTIONS_PER_LIST; i += 1) {
      full = editorReducer(full, { type: "add", sectionType: "rich_text" });
    }
    expect(ids(full)).toHaveLength(MAX_SECTIONS_PER_LIST);
    expect(editorReducer(full, { type: "add", sectionType: "rich_text" })).toBe(full);
  });

  test("a single-use section can be added once the shown copy is hidden", () => {
    const state = run(
      start("templates.product"),
      { type: "hide", id: "product-gallery" },
      { type: "add", sectionType: "product_gallery" },
    );
    expect(ids(state)).toEqual(["product-gallery", "product-details", "product-gallery-2"]);
  });
});

describe("hide and show", () => {
  test("hides and shows an optional section; back where it started is unchanged", () => {
    const shown = run(start("header"), { type: "show", id: "announcement-bar" });
    expect(pageSections(shown.document, "header")[0].hidden).toBe(false);
    expect(shown.changed).toBe(true);
    const back = run(shown, { type: "hide", id: "announcement-bar" });
    expect(back.changed).toBe(false);
  });

  test("a required section is never hidden", () => {
    const state = start("header");
    expect(editorReducer(state, { type: "hide", id: "header" })).toBe(state);
  });

  test("a hidden single-use copy is not shown next to a shown one", () => {
    const state = run(
      start("templates.product"),
      { type: "hide", id: "product-gallery" },
      { type: "add", sectionType: "product_gallery" },
    );
    expect(editorReducer(state, { type: "show", id: "product-gallery" })).toBe(state);
  });

  test("hiding what is hidden, or an unknown id, changes nothing", () => {
    const state = start("header");
    expect(editorReducer(state, { type: "hide", id: "announcement-bar" })).toBe(state);
    expect(editorReducer(state, { type: "show", id: "nope" })).toBe(state);
  });
});

describe("move", () => {
  test("moves within the page, clamped to its ends", () => {
    const state = run(start(), { type: "add", sectionType: "rich_text" }, { type: "move", id: "rich-text", to: 0 });
    expect(ids(state)).toEqual(["rich-text", "banner-slider"]);
    expect(ids(run(state, { type: "move", id: "rich-text", to: 9 }))).toEqual(["banner-slider", "rich-text"]);
  });

  test("a move that goes nowhere returns the same state", () => {
    const state = start("header");
    expect(editorReducer(state, { type: "move", id: "announcement-bar", to: 0 })).toBe(state);
  });

  test("required sections move like any other", () => {
    expect(ids(run(start("header"), { type: "move", id: "header", to: 0 }))).toEqual(["header", "announcement-bar"]);
  });

  test("moving back to the loaded order is unchanged", () => {
    const state = run(
      start("header"),
      { type: "move", id: "header", to: 0 },
      { type: "move", id: "header", to: 1 },
    );
    expect(state.changed).toBe(false);
  });
});

describe("remove", () => {
  test("removes an optional section from its page only", () => {
    const state = run(start("header"), { type: "remove", id: "announcement-bar" });
    expect(ids(state)).toEqual(["header"]);
    expect(pageSections(state.document, "templates.home")).toHaveLength(1);
    expect(state.changed).toBe(true);
  });

  test("never removes the shown copy of a required section", () => {
    for (const [page, id] of [
      ["header", "header"],
      ["footer", "footer"],
      ["templates.product", "product-details"],
    ] as const) {
      const state = start(page);
      expect(editorReducer(state, { type: "remove", id })).toBe(state);
    }
  });

  test("never touches the loaded document", () => {
    const loaded: ThemeDocument = document();
    const before = JSON.stringify(loaded);
    run(
      initEditorState({ document: loaded, manifest }, "header"),
      { type: "remove", id: "announcement-bar" },
      { type: "move", id: "header", to: 0 },
      { type: "add", sectionType: "announcement_bar" },
    );
    expect(JSON.stringify(loaded)).toBe(before);
  });
});
