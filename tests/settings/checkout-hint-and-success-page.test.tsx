/**
 * Two things the owner asked for on 2026-09-29, wired from the start:
 *
 *   the checkout's arrow down to the form   on a phone, a shopper still on their order after the
 *                                           merchant's seconds sees an arrow; a tap takes them down
 *   the Order success page                  the receipt joins the editor, and the top of a
 *                                           cash-on-delivery one is the courier or their own words
 */
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { previewTarget, templateForPath } from "@/lib/theme-editor/preview-paths";
import { TEMPLATE_PAGES } from "@/lib/theme-editor/preview-picks";
import { SLOT_PAGES, SLOTS, type SlotPageKey } from "@/lib/theme-editor/slot-catalogue";
import { choiceEdits, sectionOfType, slotValueFor, wiringFor } from "@/lib/theme-editor/slot-sections";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

const labels = (label: string) => ({ label, label_bn: `${label} (bn)` });

const manifest: ThemeManifest = {
  key: "storefront",
  name: "Storefront",
  name_bn: "স্টোরফ্রন্ট",
  category: null,
  settings: [],
  sections: {
    checkout: {
      ...labels("Checkout"),
      at_most_one: true,
      required: true,
      settings: [
        { id: "hint", type: "boolean", ...labels("hint"), default: true },
        { id: "hint_after", type: "number", ...labels("hint_after"), min: 3, max: 10, default: 5 },
      ],
    },
    success: {
      ...labels("Order success"),
      at_most_one: true,
      required: true,
      settings: [
        { id: "top", type: "select", ...labels("top"), options: ["courier", "words"], default: "courier" },
        { id: "top_text", type: "textarea", ...labels("top_text"), default: "" },
      ],
    },
    header: { ...labels("Header"), at_most_one: true, required: true, settings: [] },
    footer: { ...labels("Footer"), at_most_one: true, required: true, settings: [] },
  },
  groups: {
    header: { ...labels("Header"), sections: ["header"], default: [] },
    footer: { ...labels("Footer"), sections: ["footer"], default: [] },
  },
  templates: {
    checkout: { ...labels("Checkout"), sections: ["checkout"], default: [] },
    success: { ...labels("Order success"), sections: ["success"], default: [] },
  },
} as unknown as ThemeManifest;

const section = (id: string, type: string): ThemeSection => ({ id, type, hidden: false, settings: {}, blocks: [] });

function editor(): EditorState {
  return initEditorState({
    document: {
      theme: "storefront",
      settings: {},
      header: { sections: [section("header", "header")] },
      footer: { sections: [section("footer", "footer")] },
      templates: {
        checkout: { sections: [section("checkout", "checkout")] },
        success: { sections: [section("success", "success")] },
      },
    } as unknown as ThemeDocument,
    manifest,
    draft_revision: 1,
    has_draft: false,
  } as unknown as ThemeEditorState);
}

function pick(state: EditorState, page: SlotPageKey, key: string, value: string) {
  return choiceEdits(state.document, wiringFor(page, key)!, value, { page, key }).reduce(editorReducer, state);
}

const settingsOf = (state: EditorState, page: SlotPageKey, key: string, type: string) =>
  (sectionOfType(state.document, wiringFor(page, key)!, type)?.settings ?? {}) as Record<string, unknown>;

function wordsOf(page: SlotPageKey, key: string): string[] {
  const slot = SLOTS[page].find((one) => one.key === key)!;
  return [slot.label, slot.hint, ...(slot.options ?? []).flatMap((option) => [option.label, option.note])].filter(
    (word): word is string => Boolean(word),
  );
}

describe("the checkout's arrow down to the form", () => {
  test("on until a merchant switches it off, with the seconds as its own field", () => {
    const wiring = wiringFor("checkout", "hint")!;
    expect(wiring.page).toBe("templates.checkout");
    expect(wiring.fields).toEqual(["hint_after"]);
    expect(slotValueFor(editor().document, wiring)).toBe("on");
    expect(SLOTS.checkout.find((one) => one.key === "hint")?.initial).toBe("on");
    expect(settingsOf(pick(editor(), "checkout", "hint", "off"), "checkout", "hint", "checkout").hint).toBe(false);
  });

  test("every word it uses exists in both languages", () => {
    for (const key of wordsOf("checkout", "hint")) {
      expect((en.themeEditor.slots as Record<string, string>)[key], key).toBeTruthy();
      expect((bn.themeEditor.slots as Record<string, string>)[key], key).toBeTruthy();
    }
  });
});

describe("the Order success page", () => {
  test("a page a merchant can open, straight after the checkout", () => {
    expect(SLOT_PAGES.indexOf("success")).toBe(SLOT_PAGES.indexOf("checkout") + 1);
    expect(TEMPLATE_PAGES["templates.success"]).toBe("success");
    expect(en.themeEditor.slots.success).toBeTruthy();
    expect(bn.themeEditor.slots.success).toBeTruthy();
  });

  test("the courier until a merchant chooses their own words, which are the place's field", () => {
    const wiring = wiringFor("success", "top")!;
    expect(wiring.page).toBe("templates.success");
    expect(wiring.fields).toEqual(["top_text"]);
    expect(slotValueFor(editor().document, wiring)).toBe("courier");
    expect(settingsOf(pick(editor(), "success", "top", "words"), "success", "top", "success").top).toBe("words");
  });

  test("the shop's own header and footer, and one place of its own", () => {
    const own = SLOTS.success.filter((slot) => !slot.inheritedFrom).map((slot) => slot.key);
    expect(own).toEqual(["top"]);
    for (const key of wordsOf("success", "top")) {
      expect((en.themeEditor.slots as Record<string, string>)[key], key).toBeTruthy();
      expect((bn.themeEditor.slots as Record<string, string>)[key], key).toBeTruthy();
    }
  });

  test("previewed as a sample receipt, and a receipt is known as this page", () => {
    const examples = { category: null, product: null, searchWord: null, post: null };
    expect(previewTarget("templates.success", examples, "bn")).toEqual({ path: "/bn/success/sample" });
    expect(templateForPath("/en/success/sample")).toBe("templates.success");
    expect(templateForPath("/en/success/ord_1b64d2b73d694c1081db")).toBe("templates.success");
    expect(templateForPath("/en/success")).toBeNull();
  });
});
