/**
 * The header, wired (2026-09-24) -- the last places on the editor -- and five
 * designs since 2026-09-25 (owner: "every image I give you will be one
 * design"): classic, centred, split, minimal and compact. Search is always an
 * icon; the icons' weight, their words and the cart's shape are places of
 * their own; staying on screen has three answers. The drawing is the shop's
 * own name and departments -- it said "GADZILLA" over five invented aisles for
 * every shop -- with the shop's Phosphor icons, and reads the section, not the
 * editor's held choices.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { SLOTS } from "@/lib/theme-editor/slot-catalogue";
import { choiceEdits, sectionOfType, slotValueFor, wiringFor } from "@/lib/theme-editor/slot-sections";
import { ShopChrome, type ShopIdentity } from "@/components/theme-editor/slots/ShopChrome";
import { categoryIndex, type CategoryEntry } from "@/lib/theme-editor/link-targets";
import en from "../../messages/en.json";

const labels = (label: string) => ({ label, label_bn: `${label} (bn)` });

const manifest: ThemeManifest = {
  key: "storefront",
  name: "Storefront",
  name_bn: "স্টোরফ্রন্ট",
  category: null,
  settings: [],
  sections: {
    header: {
      ...labels("Header"),
      at_most_one: true,
      required: true,
      settings: [
        {
          id: "header_layout",
          type: "select",
          ...labels("layout"),
          options: ["classic", "centred", "split", "minimal", "compact"],
          default: "classic",
        },
        { id: "sticky", type: "select", ...labels("sticky"), options: ["off", "always", "scroll_up"], default: "scroll_up" },
        { id: "show_account_links", type: "boolean", ...labels("marks"), default: false },
        { id: "icon_weight", type: "select", ...labels("icons"), options: ["light", "regular", "bold"], default: "regular" },
        { id: "icon_labels", type: "boolean", ...labels("words"), default: false },
        { id: "cart_icon", type: "select", ...labels("cart"), options: ["bag", "basket", "cart"], default: "bag" },
      ],
    },
    announcement_bar: { ...labels("Notice"), settings: [] },
    footer: { ...labels("Footer"), at_most_one: true, required: true, settings: [] },
  },
  groups: {
    header: { ...labels("Header"), sections: ["announcement_bar", "header"], default: [] },
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

/** As `theming/0036` left a document that had the bar: classic, staying when scrolling up, no account links. */
function editor(): EditorState {
  return initEditorState({
    document: {
      theme: "storefront",
      settings: {},
      header: {
        sections: [
          section("announcement-bar", "announcement_bar", { hidden: true }),
          section("header", "header", {
            settings: { header_layout: "classic", sticky: "scroll_up", show_account_links: false },
          }),
        ],
      },
      footer: { sections: [section("footer", "footer")] },
      templates: {},
    } as unknown as ThemeDocument,
    manifest,
    draft_revision: 1,
    has_draft: false,
  } as unknown as ThemeEditorState);
}

const place = (key: string) => wiringFor("header", key)!;
const pick = (state: EditorState, key: string, value: string) =>
  choiceEdits(state.document, place(key), value, { page: "header", key }).reduce(editorReducer, state);
const settingsOf = (state: EditorState) =>
  (sectionOfType(state.document, place("layout"), "header")?.settings ?? {}) as Record<string, unknown>;

describe("the header is wired", () => {
  test("every place on it is real", () => {
    for (const slot of SLOTS.header) expect(wiringFor("header", slot.key), slot.key).toBeTruthy();
  });

  test("five designs, and no search box to choose", () => {
    const options = (key: string) => SLOTS.header.find((one) => one.key === key)!.options!.map((one) => one.value);
    expect(options("layout")).toEqual(["classic", "centred", "split", "minimal", "compact"]);
    expect(options("sticky")).toEqual(["scroll_up", "always", "off"]);
    expect(options("icons")).toEqual(["light", "regular", "bold"]);
    expect(options("cart")).toEqual(["bag", "basket", "cart"]);
    expect(SLOTS.header.find((one) => one.key === "search")).toBeUndefined();
  });

  test("a document that never chose the icons reads as the theme's defaults", () => {
    const document = editor().document;
    expect(slotValueFor(document, place("layout"))).toBe("classic");
    expect(slotValueFor(document, place("sticky"))).toBe("scroll_up");
    expect(slotValueFor(document, place("marks"))).toBe("off");
    expect(slotValueFor(document, place("icons"))).toBe("regular");
    expect(slotValueFor(document, place("words"))).toBe("off");
    expect(slotValueFor(document, place("cart"))).toBe("bag");
  });

  test("each choice writes its own setting", () => {
    expect(settingsOf(pick(editor(), "layout", "centred")).header_layout).toBe("centred");
    expect(settingsOf(pick(editor(), "sticky", "always")).sticky).toBe("always");
    expect(settingsOf(pick(editor(), "sticky", "off")).sticky).toBe("off");
    expect(settingsOf(pick(editor(), "marks", "on")).show_account_links).toBe(true);
    expect(settingsOf(pick(editor(), "icons", "light")).icon_weight).toBe("light");
    expect(settingsOf(pick(editor(), "words", "on")).icon_labels).toBe(true);
    expect(settingsOf(pick(editor(), "cart", "basket")).cart_icon).toBe("basket");
  });
});

const SHOP: ShopIdentity = {
  name: "Gadzilla",
  address: "",
  phone: "",
  email: "",
  social: [],
  wishlist: true,
  orderLookup: false,
};
const DEPARTMENTS = ["Audio", "Men", "Wearables", "Women", "Kids", "Smart Home", "Footwear"].map((label, i) => ({
  value: `cat_${i}`,
  label,
}));

const CATEGORIES = categoryIndex([
  {
    public_id: "c1",
    slug: "women",
    name: "Women",
    is_active: true,
    product_count: 4,
    children: [{ public_id: "c2", slug: "dresses", name: "Dresses", is_active: true, product_count: 2 }],
  },
  { public_id: "c3", slug: "kids", name: "Kids", is_active: true, product_count: 1 },
]);

function draw(
  slotKey: string,
  variant: string,
  over: {
    live?: ThemeSection;
    shop?: ShopIdentity;
    page?: "header" | "home";
    categories?: Record<string, CategoryEntry>;
  } = {},
) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      <ShopChrome
        page={over.page ?? "header"}
        slotKey={slotKey}
        variant={variant}
        settings={{}}
        live={over.live}
        shop={over.shop ?? SHOP}
        departments={DEPARTMENTS}
        categories={over.categories}
      />
    </NextIntlClientProvider>,
  );
}

const header = (settings: Record<string, unknown>) => section("header", "header", { settings });
const marks = (html: string) => (html.match(/data-mark="/g) ?? []).length;
const has = (html: string, mark: string) => html.includes(`data-mark="${mark}"`);

describe("the canvas draws this shop's header", () => {
  test("its own name and departments", () => {
    const html = draw("layout", "classic");
    expect(html).toContain("GADZILLA");
    expect(html).toContain("Kids");
  });

  test("classic, split and minimal carry five departments, centred eight in a row below", () => {
    for (const design of ["classic", "split", "minimal"]) {
      const html = draw("layout", design);
      expect(html, design).toContain("Kids");
      expect(html, design).not.toContain("Smart Home");
    }
    expect(draw("layout", "centred")).toContain("Footwear");
  });

  test("minimal and centred are in small capitals, classic and split are not", () => {
    expect(draw("layout", "minimal")).toContain("uppercase tracking-[0.08em]");
    expect(draw("layout", "centred")).toContain("uppercase tracking-[0.08em]");
    expect(draw("layout", "classic")).not.toContain("uppercase tracking-[0.08em]");
    expect(draw("layout", "split")).not.toContain("uppercase tracking-[0.08em]");
  });

  test("centred always writes Search beside its glass", () => {
    expect(draw("layout", "centred")).toContain(">Search</span>");
  });

  test("compact hides the departments behind a menu mark", () => {
    const html = draw("layout", "compact");
    expect(html).not.toContain("Audio");
    expect(has(html, "menu")).toBe(true);
  });

  test("account and wishlist beside the cart, and no wishlist where it is off", () => {
    expect(marks(draw("marks", "off"))).toBe(2); // search and cart
    expect(marks(draw("marks", "on"))).toBe(4);
    expect(has(draw("marks", "on", { shop: { ...SHOP, wishlist: false } }), "wishlist")).toBe(false);
  });

  test("the icons are drawn in the weight being chosen, the cart in its shape", () => {
    expect(new Set(["light", "regular", "bold"].map((weight) => draw("icons", weight))).size).toBe(3);
    expect(new Set(["bag", "basket", "cart"].map((cart) => draw("cart", cart))).size).toBe(3);
  });

  test("words beside the icons", () => {
    expect(draw("words", "on")).toContain(">Cart</span>");
    expect(draw("words", "off")).not.toContain(">Cart</span>");
  });

  test("every page's header reads the section, not the editor's held choices", () => {
    const live = header({ header_layout: "compact", show_account_links: true, icon_labels: true });
    // The design is handed in as the variant, as every page does; the marks
    // and the words are read from the section, with no held choices at all.
    const html = draw("header", "compact", { live, page: "home" });
    expect(has(html, "menu")).toBe(true);
    expect(marks(html)).toBe(5);
    expect(html).toContain(">Account</span>");
  });
});

describe("the menu (step 3, 2026-09-25)", () => {
  const item = (link: string, label = "", highlight = false) => ({
    id: `i-${link}-${label}`,
    type: "item",
    settings: { link, label, highlight },
  });
  const menu = (blocks: ReturnType<typeof item>[], settings: Record<string, unknown> = {}) =>
    header({ header_layout: "classic", ...settings, __blocks: blocks });
  const withBlocks = (live: ThemeSection) => {
    const { __blocks, ...settings } = live.settings as Record<string, unknown> & { __blocks: ThemeSection["blocks"] };
    return { ...live, settings, blocks: __blocks };
  };
  const items = (html: string) =>
    [...html.matchAll(/data-menu-item[^>]*>(?:<span[^>]*>)?([^<]*)/g)].map((m) => m[1]);

  test("its dialog holds the links and the one switch no tile decides", () => {
    const wiring = wiringFor("header", "menu")!;
    expect(wiring.blocks).toBe("item");
    expect(wiring.fields).toEqual(["dropdowns"]);
    expect(SLOTS.header.find((slot) => slot.key === "menu")?.hint).toBe("headerMenuHint");
  });

  test("each link is named as the shop names it", () => {
    const live = withBlocks(menu([item("/categories/women"), item("/new-arrivals"), item("/products", "Sale", true)]));
    const html = draw("menu", "links", { live, categories: CATEGORIES });
    expect(items(html)).toEqual(["Women", "New arrivals", "Sale"]);
    // A chip in the brand colour, as the shop draws it.
    expect(html).toMatch(/bg-shop-brand[^"]*text-shop-brand-foreground">Sale</);
  });

  test("a caret where a panel opens, and none once they are switched off", () => {
    const live = withBlocks(menu([item("/categories/women"), item("/categories/kids")]));
    expect((draw("menu", "links", { live, categories: CATEGORIES }).match(/data-menu-opens/g) ?? []).length).toBe(1);
    const off = withBlocks(menu([item("/categories/women")], { dropdowns: false }));
    expect(draw("menu", "links", { live: off, categories: CATEGORIES })).not.toContain("data-menu-opens");
  });

  test("with no links, the shop's categories", () => {
    const html = draw("menu", "links", { live: header({ header_layout: "classic" }), categories: CATEGORIES });
    expect(items(html)).toEqual(["Women", "Kids"]);
  });

  test("an empty category is left out of the shop's own list (2026-09-25)", () => {
    const withEmpty = categoryIndex([
      { public_id: "c1", slug: "women", name: "Women", is_active: true, product_count: 4 },
      { public_id: "c9", slug: "gaming", name: "Gaming", is_active: true, product_count: 0 },
    ]);
    const html = draw("menu", "links", { live: header({ header_layout: "classic" }), categories: withEmpty });
    expect(items(html)).toEqual(["Women"]);
  });

  test("More follows the row when there are more links than the design shows (2026-09-25)", () => {
    const many = categoryIndex(
      Array.from({ length: 7 }, (_, n) => ({
        public_id: `c${n}`,
        slug: `department-${n}`,
        name: `Department ${n}`,
        is_active: true,
        product_count: 1,
      })),
    );
    const classic = draw("menu", "links", { live: header({ header_layout: "classic" }), categories: many });
    expect(items(classic)).toHaveLength(5);
    expect(classic).toContain("data-menu-more");
    expect(classic).toContain(">More<");
    // Centred shows eight, so seven fit and there is no More.
    const centred = draw("menu", "links", { live: header({ header_layout: "centred" }), categories: many });
    expect(centred).not.toContain("data-menu-more");
  });
});

