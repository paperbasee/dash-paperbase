/**
 * The checkout, round 1: the page joins the theme, and its shell becomes real.
 *
 * The last page still drawn in markup no merchant could reach — ten switches
 * with nothing behind any of them, on the page the whole shop is for.
 * `theming/0028` gives every stored document the page, exactly as `0027` did
 * for the cart the day before.
 *
 * Five places here, and two of them are unlike anything wired so far: the
 * header and the footer are drawn OUTSIDE the template, so the shop reads those
 * answers in its view and hands the layout a shell. A page cannot take its own
 * header off from the inside.
 */
import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { SLOTS } from "@/lib/theme-editor/slot-catalogue";
import { storeSettingFor } from "@/lib/theme-editor/store-setting-slots";
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
    checkout: {
      ...labels("Checkout"),
      at_most_one: true,
      required: true,
      settings: [
        choice("chrome", ["reduced", "full"], "reduced"),
        choice("footer", ["policies", "same", "none"], "policies"),
        choice("order", ["quantity", "fixed"], "quantity"),
        choice("coupon", ["open", "link", "off"], "open"),
        { id: "payments", type: "boolean", ...labels("Ways to pay"), default: true },
        choice("before_pay", ["off", "note", "warning"], "off"),
        { id: "before_pay_text", type: "text", ...labels("What it says"), default: "" },
        { id: "after", type: "boolean", ...labels("A line under the button"), default: true },
        { id: "steps", type: "boolean", ...labels("Steps"), default: false },
        { id: "trust", type: "boolean", ...labels("Trust line"), default: true },
        { id: "trust_text", type: "text", ...labels("Your own words"), default: "" },
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
      templates: { checkout: { sections } },
    } as unknown as ThemeDocument,
    manifest,
    draft_revision: 1,
    has_draft: false,
  } as unknown as ThemeEditorState);
}

const place = (key: string) => wiringFor("checkout", key)!;

const pick = (state: EditorState, key: string, value: string) =>
  choiceEdits(state.document, place(key), value, { page: "checkout", key }).reduce(
    editorReducer,
    state,
  );

const settingsOf = (state: EditorState) =>
  sectionOfType(state.document, place("chrome"), "checkout")?.settings ?? {};

const PAGE = () => editor([section("checkout", "checkout")]);

describe("the checkout page is wired", () => {
  test("every place wired so far writes the one section", () => {
    for (const key of [
      "chrome",
      "footerStyle",
      "steps",
      "trust",
      "summary",
      "coupon",
      "payments",
      "beforePay",
      "after",
    ]) {
      const wiring = wiringFor("checkout", key);
      expect(wiring, key).toBeTruthy();
      expect(wiring!.page).toBe("templates.checkout");
    }
  });

  test("the form is not wired to the document, and must not be", () => {
    /*
      It is `StorefrontCheckoutSettings.customer_form_variant`, a shop setting
      that Settings → Checkout has written since long before this screen
      existed. Copying it into the theme document would make the tile's own
      promise — "change it in one place and it changes in both" — false the
      first time a merchant changed one and not the other.
    */
    expect(wiringFor("checkout", "form")).toBeFalsy();
    expect(storeSettingFor("checkout", "form")?.setting).toBe("customer_form_variant");
  });

  test("nor is the district: how it is asked for holds the order too", () => {
    /*
      `StorefrontCheckoutSettings.district_input` (2026-09-27): typed, or
      picked from the 64. The API refuses an order whose district is not on
      the list when the shop chose the list, so it is the shop's, not the
      theme's -- a theme saying "list" while the order took anything would be
      two answers to one question.
    */
    expect(wiringFor("checkout", "district")).toBeFalsy();
    expect(storeSettingFor("checkout", "district")?.setting).toBe("district_input");
    const place = SLOTS.checkout.find((slot) => slot.key === "district");
    expect(place?.initial).toBe("text");
    expect(place?.options?.map((option) => option.value)).toEqual(["text", "list"]);
  });

  test("and every other place on this page writes the document, not the shop", () => {
    for (const slot of SLOTS.checkout) {
      if (slot.key === "form" || slot.key === "district" || slot.inheritedFrom) continue;
      expect(storeSettingFor("checkout", slot.key), slot.key).toBeUndefined();
    }
  });

  test("the tile says when it is saved, and it is saved like everything else here", () => {
    /*
      It wrote itself the moment it was clicked for about an hour on
      2026-09-24, until the owner said no: this editor has ONE save, and a tile
      that wrote itself was a second one nobody asked for.
    */
    for (const key of ["form", "district"]) {
      const slot = SLOTS.checkout.find((one) => one.key === key)!;
      const hint = (en.themeEditor.slots as Record<string, string>)[slot.hint!];
      expect(hint, key).toContain("Save to store");
      expect(hint, key).not.toContain("straight away");
    }
  });

  test("and the editor holds it until then rather than writing on the click", () => {
    const editor = readFileSync(
      "src/components/theme-editor/slots/SlotEditor.tsx",
      "utf8",
    );
    const choose = editor.slice(editor.indexOf("function choose("), editor.indexOf("function setSetting("));
    expect(choose).toContain("setPendingStore");
    expect(choose).not.toContain("api.patch");
    expect(editor).toContain("await saveShopSettings();");
  });

  test("and no longer sends a merchant to a screen that does not have it", () => {
    /*
      Settings → Checkout stopped offering the chooser on 2026-09-24 (owner):
      this editor is the only screen that writes it now, so a hint promising
      the two agree would be describing a screen that no longer asks.
    */
    const slot = SLOTS.checkout.find((one) => one.key === "form")!;
    const hint = (en.themeEditor.slots as Record<string, string>)[slot.hint!];
    expect(hint).not.toContain("Settings");

    const section = readFileSync(
      "src/app/[locale]/(dashboard)/settings/sections/CheckoutSettingsSection.tsx",
      "utf8",
    );
    expect(section).not.toContain('name="customer_form_variant"');
    expect(section).toContain("tab=customization");
  });

  test("a message above the button is off until a merchant asks for one", () => {
    /* Something a merchant chooses to say, not something a shop starts saying
       on their behalf. */
    expect(slotValueFor(PAGE().document, place("beforePay"))).toBe("off");
    for (const value of ["note", "warning"]) {
      expect(settingsOf(pick(PAGE(), "beforePay", value)).before_pay).toBe(value);
    }
  });

  test("the order can still be changed here unless the merchant fixes it", () => {
    expect(slotValueFor(PAGE().document, place("summary"))).toBe("quantity");
    expect(settingsOf(pick(PAGE(), "summary", "fixed")).order).toBe("fixed");
  });

  test("the code box is open to begin with, as it is on the cart", () => {
    expect(slotValueFor(PAGE().document, place("coupon"))).toBe("open");
    for (const value of ["open", "link", "off"]) {
      expect(settingsOf(pick(PAGE(), "coupon", value)).coupon).toBe(value);
    }
  });

  test("the ways to pay are shown here, where the doubt is", () => {
    /* On by default HERE and off on the cart: how they will pay is a question
       a shopper is actually asking on this page. */
    expect(slotValueFor(PAGE().document, place("payments"))).toBe("on");
    expect(settingsOf(pick(PAGE(), "payments", "off")).payments).toBe(false);
  });

  test("and a line under the button says what happens after it", () => {
    expect(slotValueFor(PAGE().document, place("after"))).toBe("line");
    expect(settingsOf(pick(PAGE(), "after", "none")).after).toBe(false);
  });

  test("the stripped header is what a shop gets unless it asks otherwise", () => {
    expect(slotValueFor(PAGE().document, place("chrome"))).toBe("reduced");
    expect(settingsOf(pick(PAGE(), "chrome", "full")).chrome).toBe("full");
  });

  test("the footer has three answers and the shop has somewhere to put each", () => {
    const slot = SLOTS.checkout.find((one) => one.key === "footerStyle")!;
    expect(slot.options!.map((one) => one.value)).toEqual(["policies", "same", "none"]);
    for (const value of ["policies", "same", "none"]) {
      expect(settingsOf(pick(PAGE(), "footerStyle", value)).footer).toBe(value);
    }
  });

  test("the steps bar starts off, as it does on the cart", () => {
    expect(slotValueFor(PAGE().document, place("steps"))).toBe("none");
    expect(settingsOf(pick(PAGE(), "steps", "bar")).steps).toBe(true);
  });

  test("the trust line repeats the promises unless a merchant writes their own", () => {
    expect(slotValueFor(PAGE().document, place("trust"))).toBe("on");
    expect(settingsOf(pick(PAGE(), "trust", "off")).trust).toBe(false);
  });
});

describe("the editor says what the shop draws", () => {
  test("and the tile that offers it says the same", () => {
    const slot = SLOTS.checkout.find((one) => one.key === "steps")!;
    const label = slot.options!.find((one) => one.value === "bar")!.label;
    expect((en.themeEditor.slots as Record<string, string>)[label]).toBe("Cart → Checkout → Done");
  });

  test("and the tile that offers it counts the fields it really asks for", () => {
    expect(en.themeEditor.slots.formMinimal).toContain("district");
    expect(en.themeEditor.slots.formMinimalNote).toContain("Four");
  });
});
