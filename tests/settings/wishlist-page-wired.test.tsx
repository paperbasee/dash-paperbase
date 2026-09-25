/**
 * The wishlist, wired — the fifth and last page drawn in markup no merchant
 * could reach.
 *
 * Unlike the account's, all four of its places were real things the shop could
 * do, and two of them it already did. The work was the list shape, the plain
 * empty line, and one snippet shared with the render a signed-out shopper's
 * browser asks for.
 */
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { SLOTS } from "@/lib/theme-editor/slot-catalogue";
import en from "../../messages/en.json";
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
    wishlist: {
      ...labels("Wishlist"),
      at_most_one: true,
      required: true,
      settings: [
        choice("heading", ["count", "plain"], "count"),
        choice("items", ["grid", "rows"], "grid"),
        choice("action", ["cart", "look"], "cart"),
        choice("when_empty", ["invite", "text"], "invite"),
      ],
    },
    header: { ...labels("Header"), at_most_one: true, required: true, settings: [] },
    footer: { ...labels("Footer"), at_most_one: true, required: true, settings: [] },
  },
  groups: {
    header: { ...labels("Header"), sections: ["header"], default: [] },
    footer: { ...labels("Footer"), sections: ["footer"], default: [] },
  },
  templates: { wishlist: { ...labels("Wishlist"), sections: ["wishlist"], default: [] } },
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
      templates: { wishlist: { sections } },
    } as unknown as ThemeDocument,
    manifest,
    draft_revision: 1,
    has_draft: false,
  } as unknown as ThemeEditorState);
}

const place = (key: string) => wiringFor("wishlist", key)!;

const pick = (state: EditorState, key: string, value: string) =>
  choiceEdits(state.document, place(key), value, { page: "wishlist", key }).reduce(
    editorReducer,
    state,
  );

const settingsOf = (state: EditorState) =>
  (sectionOfType(state.document, place("heading"), "wishlist")?.settings ?? {}) as Record<
    string,
    unknown
  >;

const PAGE = () => editor([section("wishlist", "wishlist")]);

describe("the wishlist page is wired", () => {
  test("every place on it is real", () => {
    for (const slot of SLOTS.wishlist) {
      if (slot.inheritedFrom) continue;
      const wiring = wiringFor("wishlist", slot.key);
      expect(wiring, slot.key).toBeTruthy();
      expect(wiring!.page, slot.key).toBe("templates.wishlist");
    }
  });

  test("the title counts what is saved unless a merchant says otherwise", () => {
    expect(slotValueFor(PAGE().document, place("heading"))).toBe("withCount");
    expect(settingsOf(pick(PAGE(), "heading", "plain")).heading).toBe("plain");
  });

  test("the items are a grid until a merchant asks for a list", () => {
    expect(slotValueFor(PAGE().document, place("items"))).toBe("grid");
    expect(settingsOf(pick(PAGE(), "items", "rows")).items).toBe("rows");
  });

  test("buying straight from the list is what the page is for", () => {
    expect(slotValueFor(PAGE().document, place("action"))).toBe("cart");
    expect(settingsOf(pick(PAGE(), "action", "look")).action).toBe("look");
  });

  test("an empty list invites rather than states, because most people meet it", () => {
    expect(slotValueFor(PAGE().document, place("empty"))).toBe("invite");
    expect(settingsOf(pick(PAGE(), "empty", "text")).when_empty).toBe("text");
  });

  test("the empty answer is not called what Liquid calls nothing", () => {
    expect(settingsOf(pick(PAGE(), "empty", "text")).empty).toBeUndefined();
  });
});

describe("the tile does not promise a button the card style may not carry", () => {
  test('"Add to cart" says whose button it is', () => {
    /*
      It read "Buy straight from the list. What the page is for." — and on a
      shop whose card style is shelf, that button is Order now, not an add. The
      owner chose (2026-09-24) that a saved product behaves the way that
      product behaves everywhere else, so the note says so.
    */
    const slot = SLOTS.wishlist.find((one) => one.key === "action")!;
    const note = slot.options!.find((one) => one.value === "cart")!.note!;
    expect((en.themeEditor.slots as Record<string, string>)[note]).toContain("card style");
  });
});
