/**
 * The product page, stage 1: the places whose sections already exist.
 *
 * Three of them were the complaint that started this whole stretch of work in
 * miniature -- a choice a merchant could SEE and could not make. The trail was
 * markup in the template, and the description's box and the specifications'
 * two columns were settings the shop honoured all along that no place wrote.
 *
 * Reviews, recently viewed, the phone buy bar and delivery-and-returns were
 * stages 2 to 4. On 2026-09-25 the description, the specifications and the
 * delivery-and-returns strip became ONE place: the fold-out rows that end the
 * buying column (`theming/0034`).
 */
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { SLOTS } from "@/lib/theme-editor/slot-catalogue";
import {
  addBlockEdits,
  choiceEdits,
  placeParts,
  placeFor,
  sectionOfType,
  sectionTypesOf,
  settingsClaimedElsewhere,
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
        { id: "sticky_buy", type: "boolean", ...labels("Buy bar on a phone"), default: true },
        { id: "shipping_text", type: "textarea", ...labels("Shipping details"), default: "" },
        { id: "exchange_text", type: "textarea", ...labels("Exchange policy"), default: "" },
        { id: "show_questions", type: "boolean", ...labels("Questions about this product"), default: true },
        { id: "show_code", type: "boolean", ...labels("Product code"), default: true },
        { id: "show_quantity", type: "boolean", ...labels("Quantity"), default: true },
        { id: "whatsapp_order", type: "boolean", ...labels("Order on WhatsApp"), default: true },
        { id: "show_wishlist", type: "boolean", ...labels("Save for later"), default: true },
        { id: "show_share", type: "boolean", ...labels("Share"), default: true },
        choice("stock_count", ["off", "3", "5", "10"], "5"),
      ],
      blocks: {
        title: { ...labels("Product name"), settings: [] },
        price: { ...labels("Price"), settings: [] },
        buy_buttons: { ...labels("Buy buttons"), settings: [] },
        description: { ...labels("Description"), settings: [] },
        row: {
          ...labels("Fold-out row"),
          settings: [
            { id: "heading", type: "text", ...labels("Heading"), default: "" },
            choice("icon", ["info", "washing-machine"], "info"),
            { id: "body", type: "textarea", ...labels("Text"), default: "" },
          ],
        },
      },
    },
    related_products: { ...labels("You may also like"), settings: [] },
    recently_viewed: { ...labels("Recently viewed"), at_most_one: true, settings: [] },
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
    for (const key of ["breadcrumb", "buy", "details", "reviews", "related", "faq"]) {
      expect(place(key).page, key).toBe("templates.product");
    }
  });

  test("every place on this page is real now", () => {
    /*
      Stage 4 was the last one. A place goes in when its section can do
      everything the place promises -- so a merchant never meets a choice that
      changes nothing, which is the complaint that started this work.
    */
    for (const slot of SLOTS.product) {
      if (slot.inheritedFrom) continue;
      expect(wiringFor("product", slot.key), slot.key).not.toBeNull();
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

describe("the details rows that end the buying column", () => {
  /*
    Owner, 2026-09-25: Product details (with the specifications inside),
    Shipping details, Exchange policy and rows of the shop's own, each with an
    icon. One place for all of it, where there were three.
  */
  test("it writes the buying column, which can never be turned off", () => {
    expect(sectionTypesOf(place("details"))).toEqual(["product_details"]);
    expect(place("details").off).toBeUndefined();
  });

  test("there is nothing to choose between, so no tiles", () => {
    const slot = SLOTS.product.find((one) => one.key === "details")!;
    expect(slot.options ?? []).toEqual([]);
    expect(slot.hint).toBe("detailRowsHint");
  });

  test("the shop's words are this place's fields, and nobody else's", () => {
    expect(place("details").fields).toEqual(["shipping_text", "exchange_text"]);
    const bar = SLOTS.product.find((one) => one.key === "stickybuy")!;
    const claimed = settingsClaimedElsewhere("product", "product_details", { page: "product", key: bar.key });
    expect(claimed.has("shipping_text") && claimed.has("exchange_text")).toBe(true);
  });

  test("no tile decides anything here but the questions and the phone buy bar", () => {
    expect([...settingsDecidedOn("product", "product_details")]).toEqual(["show_questions", "sticky_buy"]);
  });

  test("its parts are the shop's own rows, not the column's name or price", () => {
    expect(place("details").blocks).toBe("row");
    const after = addBlockEdits(PAGE().document, place("details"), "row").reduce(editorReducer, PAGE());
    const blocks = sectionOfType(after.document, place("details"), "product_details")?.blocks ?? [];
    expect(blocks.map((block) => block.type)).toEqual(["row"]);
  });

  test("the old strip below the product is written by no place", () => {
    for (const slot of SLOTS.product) {
      if (slot.inheritedFrom) continue;
      expect(sectionTypesOf(place(slot.key)), slot.key).not.toContain("delivery_returns");
    }
  });
});

describe("the rows under the buying area", () => {
  test("related products is its own section and switches off", () => {
    expect(sectionTypesOf(place("related"))).toEqual(["related_products"]);
    expect(place("related").off).toBe("off");
  });

  test("the product's questions are a setting of the buying column, beside the buy button", () => {
    /* Owner, 2026-10-04: rows of the column, not a band under "You may also like". */
    expect(sectionTypesOf(place("faq"))).toEqual(["product_details"]);
    expect(place("faq").off).toBeUndefined();
  });

  test("they are on for a shop that has never chosen, because the theme says so", () => {
    expect(slotValueFor(PAGE().document, place("faq"))).toBe("on");
    expect(Object.keys(place("faq").sections)[0]).toBe("on");
    expect(manifest.sections.product_details.settings.find((s) => s.id === "show_questions")?.default).toBe(true);
  });

  test("turning them off writes false and keeps the column and its other choices", () => {
    const after = pick(PAGE(), "faq", "off");
    const details = sectionOfType(after.document, place("faq"), "product_details");
    expect(details?.settings.show_questions).toBe(false);
    expect(details?.hidden).toBe(false);
    const both = pick(after, "stickybuy", "off");
    expect(sectionOfType(both.document, place("faq"), "product_details")?.settings).toMatchObject({
      show_questions: false,
      sticky_buy: false,
    });
  });

  test("they are listed with the column's rows, before the reviews", () => {
    const keys = SLOTS.product.map((slot) => slot.key);
    expect(keys.indexOf("faq")).toBe(keys.indexOf("details") + 1);
    expect(keys.indexOf("faq")).toBeLessThan(keys.indexOf("reviews"));
  });

  test("turning related off keeps the section", () => {
    const after = pick(PAGE(), "related", "off");
    expect(sectionOfType(after.document, place("related"), "related_products")?.hidden).toBe(true);
  });
});

describe("the buying area", () => {
  /* Owner, 2026-10-04: the name, price, options and buttons beside the photos, as switches. */
  test("is the buying column's switches, edited in its dialog", () => {
    expect(sectionTypesOf(place("column"))).toEqual(["product_details"]);
    expect(place("column").fields).toEqual([
      "show_code",
      "show_quantity",
      "whatsapp_order",
      "show_wishlist",
      "show_share",
      "stock_count",
    ]);
    expect(SLOTS.product.find((slot) => slot.key === "column")?.options ?? []).toEqual([]);
  });

  test("is listed right after the photos", () => {
    const keys = SLOTS.product.map((slot) => slot.key);
    expect(keys.indexOf("column")).toBe(keys.indexOf("buy") + 1);
  });

  test("its switches are its own, not the rows' or anybody else's", () => {
    const rows = settingsClaimedElsewhere("product", "product_details", { page: "product", key: "details" });
    for (const id of ["show_code", "show_quantity", "whatsapp_order", "show_wishlist", "show_share", "stock_count"]) {
      expect(rows.has(id), id).toBe(true);
    }
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

  test("and leaves the shop's words alone", () => {
    const written = editor([
      section("details", "product_details", { settings: { shipping_text: "Two days inside Dhaka." } }),
    ]);
    const after = pick(written, "stickybuy", "off");
    expect(sectionOfType(after.document, place("stickybuy"), "product_details")?.settings).toMatchObject({
      shipping_text: "Two days inside Dhaka.",
      sticky_buy: false,
    });
  });
});

describe("the parts a place's dialog edits", () => {
  const column = section("details", "product_details", {
    blocks: [
      { id: "title", type: "title", settings: {} },
      { id: "wash", type: "row", settings: { heading: "Wash & Care" } },
      { id: "price", type: "price", settings: {} },
      { id: "size", type: "row", settings: { heading: "Size guide" } },
    ],
  } as Partial<ThemeSection>);
  const kinds = ["title", "price", "buy_buttons", "description", "row"];

  test("the rows place lists the shop's own rows and nothing of the column's", () => {
    const { blockType, blocks } = placeParts(column, kinds, place("details"));
    expect(blockType).toBe("row");
    expect(blocks.map((block) => block.id)).toEqual(["wash", "size"]);
  });

  test("a place on the column that names no kind offers no parts", () => {
    const { blockType, blocks } = placeParts(column, kinds, place("stickybuy"));
    expect(blockType).toBeUndefined();
    expect(blocks).toEqual([]);
  });

  test("a move is a position in the whole column, past the parts between", () => {
    const { stepTo } = placeParts(column, kinds, place("details"));
    expect(stepTo(1, -1)).toBe(1); // "Size guide" up: to where "Wash & Care" is
    expect(stepTo(0, 1)).toBe(3); // "Wash & Care" down: to where "Size guide" is
  });

  test("a box edits the parts it names", () => {
    const faq = section("faq", "faq", { blocks: [{ id: "q", type: "question", settings: {} }] } as Partial<ThemeSection>);
    const { blockType, blocks } = placeParts(faq, ["question"], {
      page: "templates.home",
      sections: { on: "faq" },
      blocks: "question",
    });
    expect(blockType).toBe("question");
    expect(blocks).toHaveLength(1);
  });

  test("and none it does not, even on a section with one kind (owner, 2026-09-26)", () => {
    // The Logo box shares the header with the Menu box. Guessing gave it the
    // menu's "Add a link", and an empty link took every category off the shop.
    const header = section("header", "header", {
      blocks: [{ id: "item", type: "item", settings: { link: "/about" } }],
    } as Partial<ThemeSection>);
    const logo = placeParts(header, ["item"], wiringFor("header", "logo")!);
    expect(logo.blockType).toBeUndefined();
    expect(logo.blocks).toHaveLength(0);
    expect(placeParts(header, ["item"], wiringFor("header", "menu")!).blockType).toBe("item");
  });

  test("a named kind the section does not hold is no parts", () => {
    // The hero names its pictures; its video section has none.
    const video = section("video", "video");
    expect(placeParts(video, [], wiringFor("home", "hero")!).blockType).toBeUndefined();
  });
});
