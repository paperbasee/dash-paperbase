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
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import { ShopChrome } from "@/components/theme-editor/slots/ShopChrome";
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
    checkout: {
      ...labels("Checkout"),
      at_most_one: true,
      required: true,
      settings: [
        choice("chrome", ["reduced", "full"], "reduced"),
        choice("footer", ["policies", "same", "none"], "policies"),
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
  test("every place round 1 claims writes the one section", () => {
    for (const key of ["chrome", "footerStyle", "steps", "trust"]) {
      const wiring = wiringFor("checkout", key);
      expect(wiring, key).toBeTruthy();
      expect(wiring!.page).toBe("templates.checkout");
    }
  });

  test("and the places it does not claim are still drawings", () => {
    /*
      A place goes in only when its half of the shop can do everything the
      place promises. These five are rounds 2 to 4.
    */
    for (const key of ["summary", "coupon", "form", "beforePay", "payments", "after"]) {
      expect(wiringFor("checkout", key), key).toBeFalsy();
    }
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

describe("the canvas says what the shop draws", () => {
  const draw = (slotKey: string, variant: string) =>
    renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={en}>
        <ShopChrome page="checkout" slotKey={slotKey} variant={variant} settings={{}} />
      </NextIntlClientProvider>,
    );

  test("the steps bar names the same three steps the shop names", () => {
    /*
      The editor said "Details" where the shop says "Checkout" — one bar, drawn
      on two halves of the product, saying two different things. The owner
      caught the same kind of mismatch on the cart's upsell heading.
    */
    const bar = draw("steps", "bar");
    expect(bar).toContain("Cart");
    expect(bar).toContain("Checkout");
    expect(bar).toContain("Done");
    expect(bar).not.toContain("Details");
  });

  test("and the tile that offers it says the same", () => {
    const slot = SLOTS.checkout.find((one) => one.key === "steps")!;
    const label = slot.options!.find((one) => one.value === "bar")!.label;
    expect((en.themeEditor.slots as Record<string, string>)[label]).toBe("Cart → Checkout → Done");
  });

  test("the policies footer names the three pages the shop actually serves", () => {
    /*
      It drew "Terms", which is not a page any Paperbase shop has. The three the
      footer's Information column links to are the three this draws.
    */
    const html = draw("footerStyle", "policies");
    expect(html).toContain("Cancellation");
    expect(html).not.toContain("Terms");
  });
});
