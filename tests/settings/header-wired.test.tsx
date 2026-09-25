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
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { SLOTS } from "@/lib/theme-editor/slot-catalogue";
import { choiceEdits, sectionOfType, slotValueFor, wiringFor } from "@/lib/theme-editor/slot-sections";
import { fieldSpecs } from "@/lib/theme-editor/field-specs";
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
        { id: "button_label", type: "text", ...labels("button"), default: "" },
        { id: "button_link", type: "url", ...labels("button link"), default: "" },
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

describe("the menu (step 3, 2026-09-25)", () => {
  test("its dialog holds the links and the one switch no tile decides", () => {
    const wiring = wiringFor("header", "menu")!;
    expect(wiring.blocks).toBe("item");
    expect(wiring.fields).toEqual(["dropdowns"]);
    expect(SLOTS.header.find((slot) => slot.key === "menu")?.hint).toBe("headerMenuHint");
  });
});

describe("the shop's logo (2026-09-26)", () => {
  const LOGO = "tenants/str_x/themes/logo_a.svg";
  const url = (key: string) => (key === LOGO ? "https://cdn.example.com/logo.svg" : "");

  test("is a place of the header, its sizes as tiles and its picture as its own field", () => {
    const wiring = wiringFor("header", "logo")!;
    expect(Object.keys(wiring.sections)).toEqual(["medium", "small", "large"]);
    expect(wiring.fields).toEqual(["logo"]);
    expect(SLOTS.header.find((slot) => slot.key === "logo")?.initial).toBe("medium");
  });

  test("the picture may be an SVG, and the field knows it", () => {
    const fields = fieldSpecs(
      [
        { id: "logo", type: "image", svg: true, label: "Logo", label_bn: "লোগো", default: "" },
        { id: "picture", type: "image", label: "Picture", label_bn: "ছবি", default: "" },
      ],
      "en",
    );
    expect(fields.map((field) => field.svg)).toEqual([true, false]);
  });
});

describe("step 4: the header's button (2026-09-26)", () => {
  test("over the picture is gone: the owner dropped it the same day", () => {
    expect(SLOTS.header.find((slot) => slot.key === "over")).toBeUndefined();
    expect(wiringFor("header", "over")).toBeNull();
  });

  test("the button is words and a link, in its own box", () => {
    const wiring = wiringFor("header", "button")!;
    expect(wiring.fields).toEqual(["button_label", "button_link"]);
    expect(SLOTS.header.find((slot) => slot.key === "button")?.options).toBeUndefined();
  });
});
