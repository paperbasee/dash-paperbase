/**
 * The header, wired (2026-09-24) -- the last places on the editor.
 *
 * Four settings of the one `header` section. Three arrangements where this
 * offered five (the two with the menu beside the name were taken back), and
 * search is a box or a mark with no "off". The drawing is the shop's own name
 * and departments -- it said "GADZILLA" over five invented aisles for every
 * shop -- and reads the section, not the editor's held choices.
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
        { id: "header_layout", type: "select", ...labels("layout"), options: ["bar", "masthead", "drawer"], default: "bar" },
        { id: "search", type: "select", ...labels("search"), options: ["box", "icon"], default: "box" },
        { id: "sticky", type: "boolean", ...labels("sticky"), default: true },
        { id: "show_account_links", type: "boolean", ...labels("marks"), default: false },
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

/** As every stored document holds it today: sticky, the bar, no account links. */
function editor(): EditorState {
  return initEditorState({
    document: {
      theme: "storefront",
      settings: {},
      header: {
        sections: [
          section("announcement-bar", "announcement_bar", { hidden: true }),
          section("header", "header", { settings: { header_layout: "bar", sticky: true, show_account_links: false } }),
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

  test("three arrangements, and search is never off", () => {
    const options = (key: string) => SLOTS.header.find((one) => one.key === key)!.options!.map((one) => one.value);
    expect(options("layout")).toEqual(["bar", "masthead", "drawer"]);
    expect(options("search")).toEqual(["box", "icon"]);
  });

  test("a document written before search was a choice reads as what the shop drew", () => {
    const document = editor().document;
    expect(slotValueFor(document, place("layout"))).toBe("bar");
    expect(slotValueFor(document, place("search"))).toBe("box");
    expect(slotValueFor(document, place("sticky"))).toBe("on");
    expect(slotValueFor(document, place("marks"))).toBe("off");
  });

  test("each choice writes its own setting", () => {
    expect(settingsOf(pick(editor(), "layout", "drawer")).header_layout).toBe("drawer");
    expect(settingsOf(pick(editor(), "search", "icon")).search).toBe("icon");
    expect(settingsOf(pick(editor(), "sticky", "off")).sticky).toBe(false);
    expect(settingsOf(pick(editor(), "marks", "on")).show_account_links).toBe(true);
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

function draw(slotKey: string, variant: string, over: { live?: ThemeSection; shop?: ShopIdentity; page?: "header" | "home" } = {}) {
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
      />
    </NextIntlClientProvider>,
  );
}

const header = (settings: Record<string, unknown>) => section("header", "header", { settings });
const marks = (html: string) => (html.match(/size-4 rounded-xs bg-current\/25/g) ?? []).length;

describe("the canvas draws this shop's header", () => {
  test("its own name and departments", () => {
    const html = draw("layout", "bar");
    expect(html).toContain("GADZILLA");
    expect(html).toContain("Smart Home");
  });

  test("the bar carries every department, the centred name five", () => {
    expect(draw("layout", "bar")).toContain("Footwear");
    const masthead = draw("layout", "masthead");
    expect(masthead).toContain("Kids");
    expect(masthead).not.toContain("Smart Home");
  });

  test("the drawer hides the departments behind a menu mark", () => {
    const html = draw("layout", "drawer");
    expect(html).not.toContain("Audio");
    expect(html).toContain("gap-[3px]");
  });

  test("search as a box or a mark", () => {
    expect(draw("search", "box")).toContain("rounded-xs bg-current/12");
    const icon = draw("search", "icon");
    expect(icon).not.toContain("rounded-xs bg-current/12");
    expect(icon).toContain("rounded-full border border-current/35");
  });

  test("account and wishlist beside the cart, and no wishlist where it is off", () => {
    expect(marks(draw("marks", "off"))).toBe(1);
    expect(marks(draw("marks", "on"))).toBe(3);
    expect(marks(draw("marks", "on", { shop: { ...SHOP, wishlist: false } }))).toBe(2);
  });

  test("every page's header reads the section, not the editor's held choices", () => {
    const live = header({ header_layout: "bar", search: "icon", show_account_links: true });
    const html = draw("header", "bar", { live, page: "home" });
    expect(html).not.toContain("rounded-xs bg-current/12");
    expect(marks(html)).toBe(3);
  });
});
