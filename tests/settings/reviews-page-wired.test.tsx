/**
 * Every review in the shop, on a page of its own (owner, 2026-09-25) — wired
 * from the start: two places, each one setting of the `review_page` section.
 *
 * The canvas draws this shop's own published reviews: the score worked out
 * from them, and the newest as the page lists them, each naming its product.
 */
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { ShopChrome, type ReviewPreview } from "@/components/theme-editor/slots/ShopChrome";
import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { SLOT_PAGES, SLOTS } from "@/lib/theme-editor/slot-catalogue";
import { choiceEdits, sectionOfType, slotValueFor, wiringFor } from "@/lib/theme-editor/slot-sections";
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
    review_page: {
      ...labels("All reviews"),
      at_most_one: true,
      required: true,
      settings: [choice("summary", ["bars", "none"], "bars"), choice("layout", ["rows", "cards"], "rows")],
    },
    header: { ...labels("Header"), at_most_one: true, required: true, settings: [] },
    footer: { ...labels("Footer"), at_most_one: true, required: true, settings: [] },
  },
  groups: {
    header: { ...labels("Header"), sections: ["header"], default: [] },
    footer: { ...labels("Footer"), sections: ["footer"], default: [] },
  },
  templates: { reviews: { ...labels("Reviews"), sections: ["review_page"], default: [] } },
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
      templates: { reviews: { sections } },
    } as unknown as ThemeDocument,
    manifest,
    draft_revision: 1,
    has_draft: false,
  } as unknown as ThemeEditorState);
}

const place = (key: string) => wiringFor("reviews", key)!;
const pick = (state: EditorState, key: string, value: string) =>
  choiceEdits(state.document, place(key), value, { page: "reviews", key }).reduce(editorReducer, state);
const settingsOf = (state: EditorState) =>
  (sectionOfType(state.document, place("summary"), "review_page")?.settings ?? {}) as Record<string, unknown>;
const PAGE = () => editor([section("review-page", "review_page")]);

describe("the reviews page is in the editor, and wired", () => {
  test("it is a page a merchant can open, after the product's", () => {
    expect(SLOT_PAGES.indexOf("reviews")).toBe(SLOT_PAGES.indexOf("product") + 1);
  });

  test("every place on it is real", () => {
    for (const slot of SLOTS.reviews) {
      if (slot.inherited) continue;
      const wiring = wiringFor("reviews", slot.key);
      expect(wiring, slot.key).toBeTruthy();
      expect(wiring!.page, slot.key).toBe("templates.reviews");
    }
  });

  test("the score stands above the reviews until a merchant takes it away", () => {
    expect(slotValueFor(PAGE().document, place("summary"))).toBe("bars");
    expect(settingsOf(pick(PAGE(), "summary", "none")).summary).toBe("none");
  });

  test("the reviews are a list until a merchant asks for cards", () => {
    expect(slotValueFor(PAGE().document, place("layout"))).toBe("rows");
    expect(settingsOf(pick(PAGE(), "layout", "cards")).layout).toBe("cards");
  });

  test("its choices carry the Premium badge, as the other reviews do", () => {
    for (const slot of SLOTS.reviews.filter((one) => !one.inherited)) {
      for (const option of slot.options ?? []) expect(option.premium, `${slot.key}=${option.value}`).toBe(true);
    }
  });

  test("every word it uses exists", () => {
    const words = en.themeEditor.slots as Record<string, string>;
    for (const slot of SLOTS.reviews) {
      for (const key of [slot.label, slot.hint, ...(slot.options ?? []).flatMap((o) => [o.label, o.note])]) {
        if (key) expect(words[key], key).toBeTruthy();
      }
    }
  });
});

const REVIEWS: ReviewPreview[] = [
  { name: "Rahim", rating: 3, body: "Runs a bit short.", product: "Recovery Set", byShop: false },
  { name: "Tanvir Ahmed", rating: 5, body: "Delivered the next day.", product: "Recovery Set", byShop: false },
  { name: "Farhana R.", rating: 4, body: "Good for everyday wear.", product: "Training Set", byShop: false },
  { name: "Sakib H.", rating: 4, body: "Nice and light.", product: "Recovery Set", byShop: false },
];

function draw(slotKey: string, variant: string, reviews: ReviewPreview[] = REVIEWS, page = "reviews") {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      <ShopChrome page={page as "reviews"} slotKey={slotKey} variant={variant} settings={{}} reviews={reviews} />
    </NextIntlClientProvider>,
  );
}

describe("the canvas draws this shop's own reviews", () => {
  test("the score is worked out from them, with a bar for each number of stars", () => {
    const html = draw("summary", "bars");
    expect(html).toContain(">4.0<");
    expect(html).toContain("4 reviews");
    expect(html.match(/bg-shop-brand/g)?.length).toBe(5);
  });

  test("taking the score away leaves the page's title", () => {
    const html = draw("summary", "none");
    expect(html).toContain("Reviews");
    expect(html).not.toContain("data-review-score");
  });

  test("every rating is on this page, each naming its product, under the three filters", () => {
    const html = draw("layout", "rows");
    expect(html).toContain("Runs a bit short.");
    expect(html).toContain("Recovery Set");
    for (const word of ["All stars", "All categories", "All products"]) expect(html).toContain(word);
  });

  test("the home page still quotes only the good ones", () => {
    const home = draw("reviews", "quote", REVIEWS, "home");
    expect(home).not.toContain("Runs a bit short.");
    expect(home).toContain("Delivered the next day.");
  });

  test("a list reads in a column and cards go across", () => {
    expect(draw("layout", "rows")).toContain("max-w-lg");
    // Across by the preview's own width, not the window's (2026-09-26).
    expect(draw("layout", "cards")).toContain("@xl:grid-cols-3");
  });

  test("a shop with none yet is told what its page says", () => {
    expect(draw("layout", "rows", [])).toContain("Nobody has written a review yet");
  });
});
