/**
 * The editor's page is the real shop (2026-09-26): a merchant points at their own draft to pick
 * what to change. These are the rules that turn what the page reports into one of the editor's
 * places, and a place back into what the page should outline.
 */
import { describe, expect, test } from "vitest";

import type { ThemeDocument } from "@/lib/theme-editor/api";
import {
  markForPlace,
  namedPlace,
  placeForMark,
  placesOn,
  readPickMessage,
  TEMPLATE_PAGES,
  templateOf,
} from "@/lib/theme-editor/preview-picks";
import { templateForPath } from "@/lib/theme-editor/preview-paths";
import { SLOT_PAGES, SLOTS } from "@/lib/theme-editor/slot-catalogue";

const ORIGIN = "https://preview.example.test";
const FRAME = { name: "the frame" };

const section = (id: string, type: string, settings: Record<string, unknown> = {}) => ({
  id,
  type,
  hidden: false,
  settings,
  blocks: [],
});

const DOCUMENT = {
  theme: "storefront",
  settings: {},
  header: { sections: [section("announcement-bar", "announcement_bar"), section("header", "header")] },
  footer: { sections: [section("footer", "footer")] },
  templates: {
    home: { sections: [section("hero-1", "banner_slider"), section("promo", "promo"), section("mystery", "no_such_type")] },
    cart: { sections: [section("cart", "cart")] },
  },
} as unknown as ThemeDocument;

describe("reading what the page says", () => {
  const event = (data: unknown, over: Partial<{ origin: string; source: unknown }> = {}) => ({
    origin: ORIGIN,
    source: FRAME,
    data,
    ...over,
  });
  const target = { section: "header", where: "header", place: "header:logo" };

  test("a hover and a click, each with what it was over", () => {
    expect(readPickMessage(event({ type: "pb-preview:hover", target }), ORIGIN, FRAME)).toEqual({ type: "hover", mark: target });
    expect(readPickMessage(event({ type: "pb-preview:select", target }), ORIGIN, FRAME)).toEqual({ type: "select", mark: target });
  });

  test("over nothing is said as null", () => {
    expect(readPickMessage(event({ type: "pb-preview:hover", target: null }), ORIGIN, FRAME)).toEqual({ type: "hover", mark: null });
  });

  test("only from the frame the editor opened, on the preview's origin", () => {
    expect(readPickMessage(event({ type: "pb-preview:select", target }, { origin: "https://evil.test" }), ORIGIN, FRAME)).toBeNull();
    expect(readPickMessage(event({ type: "pb-preview:select", target }, { source: {} }), ORIGIN, FRAME)).toBeNull();
    expect(readPickMessage(event({ type: "pb-preview:select", target }), ORIGIN, null)).toBeNull();
  });

  test("anything else is not a pick -- the page's own messages included", () => {
    expect(readPickMessage(event({ type: "pb-preview:ready", target }), ORIGIN, FRAME)).toBeNull();
    expect(readPickMessage(event({ type: "pb-preview:select", target: { section: 1 } }), ORIGIN, FRAME)).toBeNull();
    expect(readPickMessage(event("pb-preview:select"), ORIGIN, FRAME)).toBeNull();
  });
});

describe("a mark is a place", () => {
  test("by its own name where the page gave one", () => {
    expect(placeForMark({ section: "header", where: "header", place: "header:logo" }, DOCUMENT)).toEqual({
      page: "header",
      key: "logo",
    });
  });

  test("a place drawn on one page and owned by another is its owner's", () => {
    // The product page's promises line is the home page's Promises place.
    expect(placeForMark({ section: "", where: "", place: "home:trust" }, DOCUMENT)).toEqual({ page: "home", key: "trust" });
    expect(namedPlace("product:trust")).toBeNull();
  });

  test("otherwise the first place of the section it is in", () => {
    // The header's background is its Design; the notice strip is its own place.
    expect(placeForMark({ section: "header", where: "header", place: "" }, DOCUMENT)).toEqual({ page: "header", key: "layout" });
    expect(placeForMark({ section: "announcement-bar", where: "header", place: "" }, DOCUMENT)).toEqual({
      page: "header",
      key: "notice",
    });
    expect(placeForMark({ section: "promo", where: "home", place: "" }, DOCUMENT)).toEqual({ page: "home", key: "promo" });
    expect(placeForMark({ section: "cart", where: "cart", place: "" }, DOCUMENT)).toEqual({ page: "cart", key: "heading" });
  });

  test("a name the editor does not have falls back to the section", () => {
    expect(placeForMark({ section: "header", where: "header", place: "header:nope" }, DOCUMENT)).toEqual({
      page: "header",
      key: "layout",
    });
  });

  test("nothing, for a part the editor has no place for", () => {
    expect(placeForMark({ section: "mystery", where: "home", place: "" }, DOCUMENT)).toBeNull();
    expect(placeForMark({ section: "gone", where: "home", place: "" }, DOCUMENT)).toBeNull();
    expect(placeForMark({ section: "", where: "", place: "" }, DOCUMENT)).toBeNull();
  });
});

describe("a place is what to outline", () => {
  test("its own name, and the section it edits where the document shows one", () => {
    expect(markForPlace({ page: "home", key: "promo" }, DOCUMENT)).toEqual({ place: "home:promo", section: "promo", where: "home" });
    expect(markForPlace({ page: "header", key: "logo" }, DOCUMENT)).toEqual({
      place: "header:logo",
      section: "header",
      where: "header",
    });
  });

  test("a place with no section on the page is outlined by its name alone", () => {
    expect(markForPlace({ page: "checkout", key: "form" }, DOCUMENT)).toEqual({ place: "checkout:form", section: "", where: "" });
  });
});

describe("the list of places beside the shop", () => {
  const ids = (page: Parameters<typeof placesOn>[0]) =>
    placesOn(page).map((group) => ({ group: group.group, places: group.places.map((one) => `${one.page}:${one.key}`) }));

  test("the header's, the page's own, the footer's -- top to bottom", () => {
    const home = ids("home");
    expect(home.map((group) => group.group)).toEqual(["header", "page", "footer"]);
    expect(home[0].places).toEqual(SLOTS.header.map((slot) => `header:${slot.key}`));
    expect(home[2].places).toEqual(SLOTS.footer.map((slot) => `footer:${slot.key}`));
    expect(home[1].places).toContain("home:hero");
    expect(home[1].places).not.toContain("home:header");
  });

  test("a place owned elsewhere is listed as its owner's", () => {
    expect(ids("product")[1].places).toContain("home:trust");
  });

  test("the checkout has its own header, so only the notice strip comes from Header", () => {
    const checkout = ids("checkout");
    expect(checkout[0]).toEqual({ group: "header", places: ["header:notice"] });
    expect(checkout.map((group) => group.group)).toEqual(["header", "page"]);
    expect(checkout[1].places).toContain("checkout:chrome");
  });

  test("every place a page has is in its list, once", () => {
    for (const page of SLOT_PAGES) {
      const listed = ids(page).flatMap((group) => group.places);
      expect(new Set(listed).size, page).toBe(listed.length);
      for (const slot of SLOTS[page]) {
        const owner = slot.inheritedFrom ? `${slot.inheritedFrom.page}:${slot.inheritedFrom.key}` : `${page}:${slot.key}`;
        expect(listed, `${page}:${slot.key}`).toContain(owner);
      }
    }
  });
});

describe("pages and templates", () => {
  test("every page in the picker previews a template, and the template leads back to it", () => {
    for (const page of SLOT_PAGES) {
      const template = templateOf(page);
      expect(template, page).not.toBeNull();
      expect(TEMPLATE_PAGES[template!]).toBe(page);
    }
  });

  test("a preview address names the page it shows", () => {
    expect(TEMPLATE_PAGES[templateForPath("/en/cart")!]).toBe("cart");
    expect(TEMPLATE_PAGES[templateForPath("/bn/blog/summer-sale")!]).toBe("article");
  });
});
