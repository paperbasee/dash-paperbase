/**
 * The product page, stage 1: the places whose sections already exist.
 *
 * Three of them were the complaint that started this whole stretch of work in
 * miniature -- a choice a merchant could SEE and could not make. The trail was
 * markup in the template, and the description's box and the specifications'
 * two columns were settings the shop honoured all along that no place wrote.
 *
 * Reviews, recently viewed, the phone buy bar and delivery-and-returns are
 * stages 2 to 4 and must still read as drawings here.
 */
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { SLOTS } from "@/lib/theme-editor/slot-catalogue";
import {
  choiceEdits,
  placeFor,
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
    breadcrumb: { ...labels("Breadcrumb"), at_most_one: true, settings: [] },
    product_gallery: {
      ...labels("Product images"),
      at_most_one: true,
      settings: [choice("gallery_style", ["frame", "column", "single"], "frame")],
    },
    product_details: {
      ...labels("Buying area"),
      at_most_one: true,
      required: true,
      settings: [
        { id: "show_sku", type: "boolean", ...labels("Show the code"), default: false },
        { id: "sticky_buy", type: "boolean", ...labels("Buy bar on a phone"), default: true },
        choice("details_style", ["panel", "plain"], "panel"),
        choice("extras_style", ["grid", "accordions"], "grid"),
      ],
    },
    related_products: { ...labels("You may also like"), settings: [] },
    recently_viewed: { ...labels("Recently viewed"), at_most_one: true, settings: [] },
    product_questions: { ...labels("Questions"), settings: [{ id: "heading", type: "text", ...labels("Heading"), default: "" }] },
    product_reviews: {
      ...labels("Reviews"),
      premium: true,
      settings: [
        choice("layout", ["cards", "summary"], "cards"),
        { id: "heading", type: "text", ...labels("Heading"), default: "" },
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
    product: {
      ...labels("Product"),
      sections: [
        "breadcrumb",
        "product_gallery",
        "product_details",
        "related_products",
        "recently_viewed",
        "product_questions",
        "product_reviews",
      ],
      default: [],
    },
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
      templates: { product: { sections } },
    } as unknown as ThemeDocument,
    manifest,
    draft_revision: 1,
    has_draft: false,
  } as unknown as ThemeEditorState);
}

const place = (key: string) => wiringFor("product", key)!;

const pick = (state: EditorState, key: string, value: string) =>
  choiceEdits(state.document, place(key), value, { page: "product", key }).reduce(
    editorReducer,
    state,
  );

const settingsOf = (state: EditorState, type: string) =>
  sectionOfType(state.document, place("buy"), type)?.settings ?? {};

const PAGE = () =>
  editor([
    section("crumb", "breadcrumb"),
    section("gallery", "product_gallery"),
    section("details", "product_details"),
    section("related", "related_products"),
  ]);

describe("what stage 1 wired", () => {
  test("every place edits the product template", () => {
    for (const key of ["breadcrumb", "buy", "description", "specs", "reviews", "related", "faq"]) {
      expect(place(key).page, key).toBe("templates.product");
    }
  });

  test("only delivery and returns is still a drawing", () => {
    /*
      A place goes in when its section can do everything the place promises.
      Delivery-and-returns has no words anywhere yet -- stage 4 gives it some,
      shop-wide, typed once in the editor (owner, 2026-09-23).
    */
    expect(wiringFor("product", "shipping")).toBeNull();
    for (const key of ["recent", "stickybuy"]) {
      expect(wiringFor("product", key), key).not.toBeNull();
    }
  });

  test("the trust strip is somebody else's place, as it always was", () => {
    const slot = SLOTS.product.find((one) => one.key === "trust")!;
    expect(slot.inheritedFrom).toEqual({ page: "home", key: "trust" });
  });
});

describe("the trail", () => {
  test("it is its own section and can be turned off", () => {
    expect(sectionTypesOf(place("breadcrumb"))).toEqual(["breadcrumb"]);
    expect(place("breadcrumb").off).toBe("off");
  });

  test("turning it off hides it rather than removing it", () => {
    const after = pick(PAGE(), "breadcrumb", "off");
    expect(sectionOfType(after.document, place("breadcrumb"), "breadcrumb")?.hidden).toBe(true);
  });

  test("it is born at the top of the page", () => {
    const bare = editor([section("gallery", "product_gallery")]);
    expect(placeFor(bare.document, "product", "breadcrumb", place("breadcrumb"))).toBe(0);
  });

  test("it is the same section the category page uses", () => {
    expect(sectionTypesOf(wiringFor("category", "breadcrumb")!)).toEqual(["breadcrumb"]);
  });
});

describe("the pictures", () => {
  test("three shapes, all writing the gallery", () => {
    for (const shape of ["column", "single", "frame"]) {
      const after = pick(PAGE(), "buy", shape);
      expect(settingsOf(after, "product_gallery").gallery_style).toBe(shape);
      expect(slotValueFor(after.document, place("buy"))).toBe(shape);
    }
  });

  test("there is no off: a product page without its pictures is not one", () => {
    expect(place("buy").off).toBeUndefined();
  });

  test("a shop that has never chosen reads as a frame, the theme's own default", () => {
    expect(slotValueFor(PAGE().document, place("buy"))).toBe("frame");
    expect(Object.keys(place("buy").sections)[0]).toBe("frame");
  });
});

describe("the description and the specifications share the buying area", () => {
  test("both write product_details", () => {
    expect(sectionTypesOf(place("description"))).toEqual(["product_details"]);
    expect(sectionTypesOf(place("specs"))).toEqual(["product_details"]);
  });

  test("neither may be turned off, because the price and the buttons are in there", () => {
    expect(place("description").off).toBeUndefined();
    expect(place("specs").off).toBeUndefined();
  });

  test("the tile a merchant reads is not the value the theme stores", () => {
    /* "In a box" is `details_style: panel`; "folded away" is `accordions`. */
    expect(settingsOf(pick(PAGE(), "description", "box"), "product_details").details_style).toBe(
      "panel",
    );
    expect(settingsOf(pick(PAGE(), "specs", "folded"), "product_details").extras_style).toBe(
      "accordions",
    );
  });

  test("and the theme's default still comes first in each map", () => {
    expect(Object.keys(place("description").sections)[0]).toBe("box");
    expect(Object.keys(place("specs").sections)[0]).toBe("grid");
    expect(slotValueFor(PAGE().document, place("description"))).toBe("box");
    expect(slotValueFor(PAGE().document, place("specs"))).toBe("grid");
  });

  test("choosing one leaves the other alone", () => {
    const after = pick(pick(PAGE(), "description", "plain"), "specs", "folded");
    expect(settingsOf(after, "product_details")).toMatchObject({
      details_style: "plain",
      extras_style: "accordions",
    });
  });

  test("the dialog draws none of the three its tiles decide", () => {
    expect([...settingsDecidedOn("product", "product_details")].sort()).toEqual([
      "details_style",
      "extras_style",
      "sticky_buy",
    ]);
  });

  test("but it still draws the one no place decides", () => {
    /* `show_sku` is a field in the pop-up, not a tile on the canvas. */
    expect(settingsDecidedOn("product", "product_details").has("show_sku")).toBe(false);
  });
});

describe("the rows under the buying area", () => {
  test("related products and questions are their own sections and switch off", () => {
    expect(sectionTypesOf(place("related"))).toEqual(["related_products"]);
    expect(sectionTypesOf(place("faq"))).toEqual(["product_questions"]);
    expect(place("related").off).toBe("off");
    expect(place("faq").off).toBe("off");
  });

  test("switching questions on is born under the buying area", () => {
    const after = pick(PAGE(), "faq", "on");
    const sections = after.document.templates.product.sections;
    expect(sections.findIndex((s) => s.type === "product_questions")).toBeGreaterThan(
      sections.findIndex((s) => s.type === "product_details"),
    );
  });

  test("turning related off keeps the section", () => {
    const after = pick(PAGE(), "related", "off");
    expect(sectionOfType(after.document, place("related"), "related_products")?.hidden).toBe(true);
  });
});

describe("reviews", () => {
  test("two shapes of one section, and an off that hides rather than removes", () => {
    /*
      A shop that takes the band down for a month keeps every review it has and
      the heading it wrote.
    */
    expect(sectionTypesOf(place("reviews"))).toEqual(["product_reviews"]);
    expect(place("reviews").off).toBe("off");
  });

  test("each shape is written to the section", () => {
    for (const shape of ["summary", "cards"]) {
      const after = pick(PAGE(), "reviews", shape);
      expect(
        sectionOfType(after.document, place("reviews"), "product_reviews")?.settings.layout,
      ).toBe(shape);
      expect(slotValueFor(after.document, place("reviews"))).toBe(shape);
    }
  });

  test("the theme's own default comes first", () => {
    expect(Object.keys(place("reviews").sections)[0]).toBe("cards");
  });

  test("turning it off keeps the heading a merchant wrote", () => {
    const written = editor([
      section("details", "product_details"),
      section("reviews", "product_reviews", { settings: { heading: "What people say" } }),
    ]);
    const after = pick(written, "reviews", "off");
    const band = sectionOfType(after.document, place("reviews"), "product_reviews");
    expect(band?.hidden).toBe(true);
    expect(band?.settings.heading).toBe("What people say");
  });

  test("both shapes are paid, and the gate is the theme's not the editor's", () => {
    /*
      A lapsed shop stops being SERVED the band and is never refused at save,
      or a downgraded shop could not save its theme at all.
    */
    const slot = SLOTS.product.find((one) => one.key === "reviews")!;
    for (const option of slot.options ?? []) {
      if (option.value === "off") continue;
      expect(option.premium, option.value).toBe(true);
    }
    expect(manifest.sections.product_reviews.premium).toBe(true);
  });

  test("a page with no band at all reads as off", () => {
    const bare = editor([section("details", "product_details")]);
    expect(slotValueFor(bare.document, place("reviews"))).toBe("off");
  });
});

describe("the shopper's own trail, and the phone buy bar", () => {
  test("recently viewed is a section that can be turned off", () => {
    expect(sectionTypesOf(place("recent"))).toEqual(["recently_viewed"]);
    expect(place("recent").off).toBe("off");
  });

  test("it is born last, under everything a merchant did arrange", () => {
    const page = PAGE();
    expect(placeFor(page.document, "product", "recent", place("recent"))).toBe(
      page.document.templates.product.sections.length,
    );
  });

  test("a page that has it reads as on", () => {
    const withStrip = editor([
      section("details", "product_details"),
      section("strip", "recently_viewed"),
    ]);
    expect(slotValueFor(withStrip.document, place("recent"))).toBe("on");
  });

  test("the buy bar is a setting of the buying column, not a section", () => {
    /*
      It is part of buying: it sits inside the buy scope so the cart and the
      variant picker drive it, and a merchant does not arrange it anywhere.
    */
    expect(sectionTypesOf(place("stickybuy"))).toEqual(["product_details"]);
    expect(place("stickybuy").off).toBeUndefined();
  });

  test("it is on for a shop that has never chosen, because the theme says so", () => {
    expect(slotValueFor(PAGE().document, place("stickybuy"))).toBe("on");
    expect(Object.keys(place("stickybuy").sections)[0]).toBe("on");
    expect(manifest.sections.product_details.settings.find((s) => s.id === "sticky_buy")?.default).toBe(
      true,
    );
  });

  test("turning it off writes false rather than removing the column", () => {
    const after = pick(PAGE(), "stickybuy", "off");
    const details = sectionOfType(after.document, place("stickybuy"), "product_details");
    expect(details?.settings.sticky_buy).toBe(false);
    expect(details?.hidden).toBe(false);
  });

  test("and leaves the description and the specifications alone", () => {
    const after = pick(pick(PAGE(), "description", "plain"), "stickybuy", "off");
    expect(sectionOfType(after.document, place("stickybuy"), "product_details")?.settings).toMatchObject({
      details_style: "plain",
      sticky_buy: false,
    });
  });
});
