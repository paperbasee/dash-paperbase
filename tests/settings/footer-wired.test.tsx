/**
 * The footer, wired (2026-09-24).
 *
 * All five places are settings of the one `footer` section, drawn at the bottom
 * of every page. A document never touched reads as the shop drew it. There is
 * no sign-up: the email one went with the email newsletter, and the WhatsApp
 * one with the home page's band (owner, 2026-09-24). And the drawing is the
 * shop's own: its name, contact, social links and pages, where
 * it used to be "Gadzilla, 12 Gulshan Avenue" with Careers and Wholesale for
 * every merchant, and Visa and Mastercard for a platform with no card gateway.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { SLOTS } from "@/lib/theme-editor/slot-catalogue";
import { choiceEdits, sectionOfType, slotValueFor, wiringFor } from "@/lib/theme-editor/slot-sections";
import { ShopChrome, type ShopIdentity } from "@/components/theme-editor/slots/ShopChrome";
import en from "../../messages/en.json";

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
    footer: {
      ...labels("Footer"),
      at_most_one: true,
      required: true,
      settings: [
        choice("footer_layout", ["columns", "split", "centred", "minimal"], "columns"),
        choice("contact", ["full", "email", "off"], "full"),
        choice("social", ["names", "marks", "off"], "names"),
        { id: "payments", type: "boolean", ...labels("payments"), default: false },
        choice("bottom", ["copyright", "policies"], "copyright"),
      ],
    },
    header: { ...labels("Header"), at_most_one: true, required: true, settings: [] },
  },
  groups: {
    header: { ...labels("Header"), sections: ["header"], default: [] },
    footer: { ...labels("Footer"), sections: ["footer"], default: [] },
  },
  templates: {},
} as unknown as ThemeManifest;

const section = (id: string, type: string, over: Partial<ThemeSection> = {}): ThemeSection => ({
  id,
  type,
  hidden: false,
  settings: {},
  blocks: [],
  ...over,
});

function editor(): EditorState {
  return initEditorState({
    document: {
      theme: "storefront",
      settings: {},
      header: { sections: [section("header", "header")] },
      footer: { sections: [section("footer", "footer")] },
      templates: {},
    } as unknown as ThemeDocument,
    manifest,
    draft_revision: 1,
    has_draft: false,
  } as unknown as ThemeEditorState);
}

const place = (key: string) => wiringFor("footer", key)!;
const pick = (state: EditorState, key: string, value: string) =>
  choiceEdits(state.document, place(key), value, { page: "footer", key }).reduce(editorReducer, state);
const settingsOf = (state: EditorState) =>
  (sectionOfType(state.document, place("layout"), "footer")?.settings ?? {}) as Record<string, unknown>;

describe("the footer is wired", () => {
  test("every place on it is real", () => {
    for (const slot of SLOTS.footer) {
      expect(wiringFor("footer", slot.key), slot.key).toBeTruthy();
      expect(wiringFor("footer", slot.key)!.page, slot.key).toBe("footer");
    }
  });

  test("a document that has never been touched reads as what the shop drew", () => {
    const document = editor().document;
    expect(slotValueFor(document, place("layout"))).toBe("columns");
    expect(slotValueFor(document, place("contact"))).toBe("full");
    expect(slotValueFor(document, place("social"))).toBe("names");
    expect(slotValueFor(document, place("payments"))).toBe("off");
    expect(slotValueFor(document, place("bottom"))).toBe("copyright");
  });

  test("each choice writes its own setting", () => {
    expect(settingsOf(pick(editor(), "layout", "centred")).footer_layout).toBe("centred");
    expect(settingsOf(pick(editor(), "contact", "email")).contact).toBe("email");
    expect(settingsOf(pick(editor(), "social", "marks")).social).toBe("marks");
    expect(settingsOf(pick(editor(), "payments", "on")).payments).toBe(true);
    expect(settingsOf(pick(editor(), "bottom", "policies")).bottom).toBe("policies");
  });

  test("there is no sign-up at all: the home page's band is the one", () => {
    expect(SLOTS.footer.map((one) => one.key)).not.toContain("newsletter");
    expect(wiringFor("footer", "newsletter")).toBeNull();
  });

  test("the defaults the tiles start on are the shop's", () => {
    expect(SLOTS.footer.find((one) => one.key === "social")!.initial).toBe("names");
    expect(SLOTS.footer.find((one) => one.key === "payments")!.initial).toBe("off");
  });
});

const SHOP: ShopIdentity = {
  name: "Gadzilla",
  address: "College avenue lane No. 10, Barishal",
  phone: "01234567891",
  email: "contact@gadzilla.com",
  social: ["whatsapp"],
  wishlist: true,
  orderLookup: false,
};

function draw(slotKey: string, variant: string | undefined, over: { shop?: ShopIdentity; live?: ThemeSection } = {}) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      <ShopChrome page="footer" slotKey={slotKey} variant={variant} settings={{}} shop={over.shop ?? SHOP} live={over.live} />
    </NextIntlClientProvider>,
  );
}

const footer = (settings: Record<string, unknown>) => section("footer", "footer", { settings });

describe("the canvas draws this shop's footer", () => {
  test("nothing another shop has, and no card the platform cannot take", () => {
    const guilty: string[] = [];
    for (const slot of SLOTS.footer) {
      for (const option of slot.options ?? []) {
        const html = draw(slot.key, option.value, {
          live: footer({ payments: true, social: "names", bottom: "policies" }),
        });
        for (const word of ["12 Gulshan", "+880 1700", "hello@gadzilla", "Careers", "Wholesale", "YouTube", "Visa", "Mastercard", "Rocket"]) {
          if (html.includes(word)) guilty.push(`${slot.key}=${option.value} says "${word}"`);
        }
      }
    }
    expect(guilty).toEqual([]);
  });

  test("the merchant's own name and contact", () => {
    const html = draw("layout", "columns");
    expect(html).toContain("College avenue lane No. 10, Barishal");
    expect(html).toContain("01234567891");
    expect(html).toContain("contact@gadzilla.com");
  });

  test("email only is the email only", () => {
    const html = draw("contact", "email");
    expect(html).toContain("contact@gadzilla.com");
    expect(html).not.toContain("Barishal");
  });

  test("the links follow the shop's own switches", () => {
    expect(draw("layout", "columns")).toContain("Wishlist");
    expect(draw("layout", "columns")).not.toContain("Track your order");
  });

  test("only the social links the merchant filled in", () => {
    const html = draw("social", "names");
    expect(html).toContain("WhatsApp");
    expect(html).not.toContain("Facebook");
  });

  test("the payment marks are what the shop takes", () => {
    const html = draw("payments", "on");
    for (const method of ["Cash on delivery", "bKash", "Nagad"]) expect(html).toContain(method);
  });

  test("the policies are the pages the shop has", () => {
    const html = draw("bottom", "policies");
    expect(html).toContain("Privacy policy · Return &amp; refund · Shipping policy");
    expect(html).not.toContain("Terms");
  });

  test("the whole footer reads the section, not the editor's old held choices", () => {
    const html = draw("layout", "columns", { live: footer({ social: "off", bottom: "policies" }) });
    expect(html).not.toContain(">WhatsApp<");
    expect(html).toContain("Shipping policy</span>");
  });

  test("a shop that has filled nothing in is told where to", () => {
    const empty: ShopIdentity = { ...SHOP, address: "", phone: "", email: "", social: [] };
    expect(draw("contact", "full", { shop: empty })).toContain("Add your address, phone and email in Settings");
    expect(draw("social", "names", { shop: empty })).toContain("Add your social links in Settings");
  });
});
