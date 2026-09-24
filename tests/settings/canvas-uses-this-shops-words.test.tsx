/**
 * The editor's canvas draws THIS shop's words, never another shop's.
 *
 * The owner's complaint, twice on 2026-09-23: the category page said "About our
 * bags" and the search page said `Results for "bag"` to a shop that sells audio
 * gear and cameras. A merchant reading about somebody else's aisle cannot tell
 * whether they are looking at their shop or at a brochure.
 *
 * These pages are TEMPLATES -- one drawing stands for every category and every
 * search -- so the stand-in is the merchant's own first department, and a shop
 * with no departments yet gets plain words rather than an invented product.
 *
 * A sweep rather than a list of the places I found: the word turned up in four
 * places on the category page and four more on search, each discovered
 * separately.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import { ShopChrome } from "@/components/theme-editor/slots/ShopChrome";
import { SLOTS, type SlotPageKey } from "@/lib/theme-editor/slot-catalogue";
import en from "../../messages/en.json";

const DEPARTMENTS = [
  { value: "cat_1", label: "Wearables" },
  { value: "cat_2", label: "Audio" },
  { value: "cat_3", label: "Cameras" },
];

/** The pages whose drawings stand for one category or one search. */
const PAGES: SlotPageKey[] = ["category", "search"];

/**
 * Words that belong to a shop that does not exist.
 *
 * Product names in a grid are deliberately NOT on this list: a card-shaped
 * preview has to show something card-shaped, the editor has no product list to
 * draw from, and the live preview beside the canvas shows the merchant's real
 * products. What is banned is inventing a CATEGORY or a search a shop never had.
 */
const NOT_THIS_SHOPS = ["Bags", "Shirts", "Shoes", "Travel", "Accessories"];

function draw(page: SlotPageKey, slotKey: string, variant: string | undefined, departments = DEPARTMENTS) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      <ShopChrome
        page={page}
        slotKey={slotKey}
        variant={variant}
        settings={{}}
        departments={departments}
      />
    </NextIntlClientProvider>,
  );
}

describe("the canvas names this shop's own departments", () => {
  for (const page of PAGES) {
    test(`nothing on the ${page} page names a department no shop has`, () => {
      const guilty: string[] = [];
      for (const slot of SLOTS[page]) {
        if (slot.inherited) continue;
        const values = (slot.options ?? []).map((option) => option.value);
        for (const variant of values.length ? values : [slot.initial]) {
          const html = draw(page, slot.key, variant);
          for (const word of NOT_THIS_SHOPS) {
            if (html.includes(word)) guilty.push(`${page}:${slot.key}=${variant} says "${word}"`);
          }
        }
      }
      expect(guilty).toEqual([]);
    });
  }

  test("the category page stands for the merchant's own first department", () => {
    for (const slot of ["breadcrumb", "heading", "empty", "text"]) {
      const html = draw("category", slot, slot === "heading" ? "plain" : undefined);
      expect(html, slot).toContain("Wearables");
    }
  });

  test("and so does the search page", () => {
    expect(draw("search", "heading", "withCount")).toContain("Wearables");
    expect(draw("search", "empty", "text")).toContain("Wearables");
    expect(draw("search", "categories", "on")).toContain("Audio");
  });

  test("a shop with no departments yet gets plain words, not an invented product", () => {
    const html = draw("search", "heading", "withCount", []);
    expect(html).toContain("what they typed");
    for (const word of NOT_THIS_SHOPS) expect(html).not.toContain(word);
  });

});
