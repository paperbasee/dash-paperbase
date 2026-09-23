/**
 * The cart, round 1: the page joins the theme, and four places become real.
 *
 * The cart was the emptiest page in the editor -- eleven places, not one of
 * them with anywhere to write, because the theme had no cart template and no
 * cart section at all. `theming/0027` gives every stored document the page.
 *
 * All four write ONE section: the cart page is one thing, not a stack of bands.
 */
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { SLOTS } from "@/lib/theme-editor/slot-catalogue";
import en from "../../messages/en.json";
import bn from "../../messages/bn.json";
import {
  choiceEdits,
  sectionOfType,
  sectionTypesOf,
  settingsDecidedOn,
  slotValueFor,
  wiringFor,
} from "@/lib/theme-editor/slot-sections";

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
    cart: {
      ...labels("Cart"),
      at_most_one: true,
      required: true,
      settings: [
        { id: "heading_link", type: "boolean", ...labels("Continue shopping"), default: true },
        choice("lines", ["cards", "table"], "cards"),
        choice("total", ["full", "simple"], "full"),
        choice("coupon", ["open", "link", "off"], "open"),
        { id: "payments", type: "boolean", ...labels("Ways to pay"), default: false },
        { id: "sticky", type: "boolean", ...labels("Sticky total"), default: true },
        choice("when_empty", ["text", "invite"], "text"),
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
    cart: { ...labels("Cart"), sections: ["cart"], default: [] },
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
      templates: { cart: { sections } },
    } as unknown as ThemeDocument,
    manifest,
    draft_revision: 1,
    has_draft: false,
  } as unknown as ThemeEditorState);
}

const place = (key: string) => wiringFor("cart", key)!;

const pick = (state: EditorState, key: string, value: string) =>
  choiceEdits(state.document, place(key), value, { page: "cart", key }).reduce(editorReducer, state);

const settingsOf = (state: EditorState) =>
  sectionOfType(state.document, place("lines"), "cart")?.settings ?? {};

const PAGE = () => editor([section("cart", "cart")]);

describe("the cart joins the theme", () => {
  test("every real place writes the cart page", () => {
    for (const key of ["heading", "lines", "total", "coupon", "payments", "sticky", "empty"]) {
      expect(place(key).page, key).toBe("templates.cart");
      expect(sectionTypesOf(place(key)), key).toEqual(["cart"]);
    }
  });

  test("four are still drawings", () => {
    /*
      A place goes in when its section can do everything the place promises.
      Round 3 brings the upsell and recently viewed; round 4 the trust line and
      the steps bar.
    */
    for (const key of ["steps", "trust", "upsell", "recent"]) {
      expect(wiringFor("cart", key), key).toBeNull();
    }
  });

  test("none of them may be turned off: a cart page needs its cart", () => {
    for (const key of ["heading", "lines", "total", "coupon", "payments", "sticky", "empty"]) {
      expect(place(key).off, key).toBeUndefined();
    }
    expect(manifest.sections.cart.required).toBe(true);
  });
});

describe("the four choices", () => {
  test("each writes its own setting and leaves the others alone", () => {
    const after = ["heading", "lines", "total", "empty"].reduce(
      (state, key) =>
        pick(state, key, { heading: "plain", lines: "table", total: "simple", empty: "invite" }[key]!),
      PAGE(),
    );
    expect(settingsOf(after)).toMatchObject({
      heading_link: false,
      lines: "table",
      total: "simple",
      when_empty: "invite",
    });
  });

  test("a shop that has never chosen reads as what its cart already draws", () => {
    const page = PAGE();
    expect(slotValueFor(page.document, place("heading"))).toBe("withLink");
    expect(slotValueFor(page.document, place("lines"))).toBe("cards");
    expect(slotValueFor(page.document, place("total"))).toBe("full");
    expect(slotValueFor(page.document, place("empty"))).toBe("text");
  });

  test("the theme's default comes first in every map", () => {
    expect(Object.keys(place("heading").sections)[0]).toBe("withLink");
    expect(Object.keys(place("lines").sections)[0]).toBe("cards");
    expect(Object.keys(place("total").sections)[0]).toBe("full");
    expect(Object.keys(place("empty").sections)[0]).toBe("text");
  });

  test("the dialog draws none of them, because the tiles decide them all", () => {
    expect([...settingsDecidedOn("cart", "cart")].sort()).toEqual([
      "coupon",
      "heading_link",
      "lines",
      "payments",
      "sticky",
      "total",
      "when_empty",
    ]);
  });

  test("the editor's own name for the empty place is not the theme's", () => {
    /*
      `empty` is a reserved word in Liquid, which the category grid met the hard
      way. The PLACE keeps the name -- nothing in Liquid reads it -- and the
      SETTING is `when_empty`.
    */
    const slot = SLOTS.cart.find((one) => one.key === "empty")!;
    expect(slot.key).toBe("empty");
    expect(Object.keys(place("empty").sections)).toEqual(["text", "invite"]);
    expect(settingsOf(pick(PAGE(), "empty", "invite")).when_empty).toBe("invite");
  });
});

describe("round 2: the money", () => {
  test("the coupon box has three shapes, and open comes first", () => {
    expect(Object.keys(place("coupon").sections)).toEqual(["open", "link", "off"]);
    expect(slotValueFor(PAGE().document, place("coupon"))).toBe("open");
  });

  test("each shape is written to the cart", () => {
    for (const shape of ["link", "off", "open"]) {
      expect(settingsOf(pick(PAGE(), "coupon", shape)).coupon).toBe(shape);
    }
  });

  test("the payments row is off until a merchant asks", () => {
    expect(slotValueFor(PAGE().document, place("payments"))).toBe("off");
    expect(settingsOf(pick(PAGE(), "payments", "on")).payments).toBe(true);
  });

  test("the sticky total is on unless a merchant says otherwise", () => {
    expect(slotValueFor(PAGE().document, place("sticky"))).toBe("on");
    expect(settingsOf(pick(PAGE(), "sticky", "off")).sticky).toBe(false);
  });

  test("the coupon note no longer says the shop has no coupons", () => {
    /*
      It said "Paperbase has no coupons yet -- there is no code to make, no
      limit, no expiry date", which stopped being true on 2026-09-22.
    */
    const slot = SLOTS.cart.find((one) => one.key === "coupon")!;
    expect(slot.hint).toBe("checkoutCouponHint");
    expect(en.themeEditor.slots.checkoutCouponHint).not.toContain("no coupons yet");
    expect(bn.themeEditor.slots.checkoutCouponHint).not.toContain("কুপন নেই");
  });
});
