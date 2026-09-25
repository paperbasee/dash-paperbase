/**
 * The search page, wired (2026-09-24).
 *
 * It was always a page of the theme -- one section, no settings -- so every
 * place here is a setting of that section, and a document written before today
 * has to read as exactly what the shop drew.
 *
 * Two of the seven places it had were not kept as they were: "Other things to
 * try" promised near-miss spellings nothing in Paperbase can find, and the
 * matching categories moved ABOVE the products, where the shop has always
 * drawn them.
 */
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { SLOTS } from "@/lib/theme-editor/slot-catalogue";
import en from "../../messages/en.json";
import bn from "../../messages/bn.json";
import { choiceEdits, sectionOfType, slotValueFor, wiringFor } from "@/lib/theme-editor/slot-sections";

const labels = (label: string) => ({ label, label_bn: `${label} (bn)` });
const choice = (id: string, options: string[], fallback: string) => ({
  id,
  type: "select",
  ...labels(id),
  options,
  default: fallback,
});

const manifest: ThemeManifest = {
  key: "storefront",
  name: "Storefront",
  name_bn: "স্টোরফ্রন্ট",
  category: null,
  settings: [],
  sections: {
    search_results: {
      ...labels("Search results"),
      at_most_one: true,
      required: true,
      settings: [
        choice("heading", ["count", "plain"], "count"),
        { id: "categories", type: "boolean", ...labels("categories"), default: true },
        choice("columns", ["four", "three", "two"], "four"),
        choice("more", ["none", "button", "pages"], "none"),
        choice("when_empty", ["text", "invite"], "text"),
        choice("prompt", ["hint", "trending"], "hint"),
      ],
    },
    header: { ...labels("Header"), at_most_one: true, required: true, settings: [] },
    footer: { ...labels("Footer"), at_most_one: true, required: true, settings: [] },
  },
  groups: {
    header: { ...labels("Header"), sections: ["header"], default: [] },
    footer: { ...labels("Footer"), sections: ["footer"], default: [] },
  },
  templates: { search: { ...labels("Search"), sections: ["search_results"], default: [] } },
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
      templates: { search: { sections } },
    } as unknown as ThemeDocument,
    manifest,
    draft_revision: 1,
    has_draft: false,
  } as unknown as ThemeEditorState);
}

const place = (key: string) => wiringFor("search", key)!;

const pick = (state: EditorState, key: string, value: string) =>
  choiceEdits(state.document, place(key), value, { page: "search", key }).reduce(
    editorReducer,
    state,
  );

const settingsOf = (state: EditorState) =>
  (sectionOfType(state.document, place("heading"), "search_results")?.settings ?? {}) as Record<
    string,
    unknown
  >;

/** A page as every stored document holds it today: the section, no settings. */
const PAGE = () => editor([section("search-results", "search_results")]);

describe("the search page is wired", () => {
  test("every place on it is real", () => {
    for (const slot of SLOTS.search) {
      if (slot.inheritedFrom) continue;
      const wiring = wiringFor("search", slot.key);
      expect(wiring, slot.key).toBeTruthy();
      expect(wiring!.page, slot.key).toBe("templates.search");
    }
  });

  test("a document that has never been touched reads as what the shop drew", () => {
    const document = PAGE().document;
    expect(slotValueFor(document, place("heading"))).toBe("withCount");
    expect(slotValueFor(document, place("categories"))).toBe("on");
    expect(slotValueFor(document, place("grid"))).toBe("four");
    expect(slotValueFor(document, place("more"))).toBe("none");
    expect(slotValueFor(document, place("empty"))).toBe("text");
    expect(slotValueFor(document, place("prompt"))).toBe("hint");
  });

  test("each choice writes its own setting", () => {
    expect(settingsOf(pick(PAGE(), "heading", "plain")).heading).toBe("plain");
    expect(settingsOf(pick(PAGE(), "grid", "two")).columns).toBe("two");
    expect(settingsOf(pick(PAGE(), "more", "pages")).more).toBe("pages");
    expect(settingsOf(pick(PAGE(), "empty", "invite")).when_empty).toBe("invite");
    expect(settingsOf(pick(PAGE(), "prompt", "trending")).prompt).toBe("trending");
  });

  test("switching the categories off switches off the categories, not the results", () => {
    const after = pick(PAGE(), "categories", "off");
    expect(settingsOf(after).categories).toBe(false);
    const held = sectionOfType(after.document, place("heading"), "search_results")!;
    expect(held.hidden).toBe(false);
    expect(slotValueFor(after.document, place("categories"))).toBe("off");
  });

  test("the empty answer is not called what Liquid calls nothing", () => {
    expect(settingsOf(pick(PAGE(), "empty", "invite")).empty).toBeUndefined();
  });
});

describe("the page promises only what the shop does", () => {
  test("there is no promise of near-miss spellings", () => {
    /*
      "Other things to try -- near-miss names, so a bad spelling is not a dead
      end." Nothing in Paperbase finds a near miss: the only suggestions the API
      has are names of products that ALREADY matched, which are empty exactly
      when a spelling is wrong. Taken back, owner 2026-09-24.
    */
    expect(SLOTS.search.map((one) => one.key)).not.toContain("suggestions");
    const slots = en.themeEditor.slots as Record<string, string>;
    expect(Object.keys(slots).filter((key) => key.startsWith("searchSuggestions"))).toEqual([]);
  });

  test("the categories come above the products, where the shop draws them", () => {
    const keys = SLOTS.search.map((one) => one.key);
    expect(keys.indexOf("categories")).toBeLessThan(keys.indexOf("grid"));
  });

  test("no note still describes the retired storefront's ten results", () => {
    /*
      The notes said search "never returns more than ten" and that its
      prev/next could never appear -- both true of the Next storefront, neither
      of the shop that replaced it, which shows 48 at a time.
    */
    for (const messages of [en, bn]) {
      const slots = messages.themeEditor.slots as Record<string, string>;
      for (const slot of SLOTS.search) {
        const keys = [slot.hint, ...(slot.options ?? []).map((one) => one.note)].filter(Boolean);
        for (const key of keys) {
          expect(slots[key!], key).not.toMatch(/\bten\b|দশ/);
        }
      }
    }
  });
});
