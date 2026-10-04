/**
 * The category page: the path back up, the heading, and the grid.
 *
 * The first entry where two places share ONE section -- the heading's shape and
 * its count are both `category_header`, and how many across, how a shopper
 * reaches the rest and what an empty category says are all `product_grid`. So
 * most of this file is about the two things that makes true: a missing setting
 * has to read as the theme's own default, and a setting one place decides must
 * not be drawn as a field in the other's dialog.
 *
 * Sorting and filtering are still drawings, deliberately: a place is wired when
 * its section can do everything the place promises.
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
    category_header: {
      ...labels("Category name and description"),
      settings: [
        choice("layout", ["plain", "eyebrow", "banner"], "plain"),
        { id: "show_count", type: "boolean", ...labels("How many there are"), default: false },
      ],
    },
    product_grid: {
      ...labels("Product list"),
      required: true,
      settings: [
        choice("columns", ["four", "three", "two"], "four"),
        choice("more", ["pages", "button", "none"], "pages"),
        choice("sort", ["off", "menu", "tabs"], "off"),
        choice("filters", ["off", "chips", "rail"], "off"),
        choice("when_empty", ["text", "invite"], "text"),
      ],
    },
    rich_text: {
      ...labels("Text"),
      settings: [{ id: "heading", type: "text", ...labels("Heading"), default: "" }],
    },
    header: {
      ...labels("Header"),
      at_most_one: true,
      required: true,
      settings: [
        {
          id: "header_layout",
          type: "select",
          ...labels("header_layout"),
          options: ["classic", "centred", "split", "minimal", "compact"],
          default: "classic",
        },
        { id: "sticky", type: "select", ...labels("sticky"), options: ["off", "always", "scroll_up"], default: "scroll_up" },
        { id: "show_account_links", type: "boolean", ...labels("show_account_links"), default: false },
      ],
    },
    // Wired since 2026-09-24, and drawn at the bottom of this page -- so the
    // settings its places decide are ones this manifest has to offer.
    footer: {
      ...labels("Footer"),
      at_most_one: true,
      required: true,
      settings: [
        { id: "footer_layout", type: "select", ...labels("footer_layout"), options: ["columns", "split", "centred", "minimal"], default: "columns" },
        { id: "contact", type: "select", ...labels("contact"), options: ["full", "email", "off"], default: "full" },
        { id: "social", type: "select", ...labels("social"), options: ["names", "marks", "off"], default: "names" },
        { id: "payments", type: "boolean", ...labels("payments"), default: false },
        { id: "signup", type: "select", ...labels("signup"), options: ["off", "whatsapp"], default: "off" },
        { id: "bottom", type: "select", ...labels("bottom"), options: ["copyright", "policies"], default: "copyright" },
      ],
    },
  },
  groups: {
    header: { ...labels("Header"), sections: ["header"], default: [] },
    footer: { ...labels("Footer"), sections: ["footer"], default: [] },
  },
  templates: {
    category: {
      ...labels("Category"),
      sections: ["breadcrumb", "category_header", "product_grid", "rich_text"],
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
      templates: { category: { sections } },
    } as unknown as ThemeDocument,
    manifest,
    draft_revision: 1,
    has_draft: false,
  } as unknown as ThemeEditorState);
}

const place = (key: string) => wiringFor("category", key)!;

const pick = (state: EditorState, key: string, value: string) =>
  choiceEdits(state.document, place(key), value, { page: "category", key }).reduce(
    editorReducer,
    state,
  );

const settingsOf = (state: EditorState, type: string) =>
  sectionOfType(state.document, place("grid"), type)?.settings ?? {};

const PAGE = () =>
  editor([
    section("crumb", "breadcrumb"),
    section("head", "category_header"),
    section("grid", "product_grid"),
  ]);

describe("every place is a page of the document", () => {
  test("they all edit the category template", () => {
    for (const key of [
      "breadcrumb",
      "heading",
      "count",
      "sort",
      "filters",
      "grid",
      "more",
      "text",
      "empty",
    ]) {
      expect(place(key).page).toBe("templates.category");
    }
  });

  test("every place on this page is real now", () => {
    /*
      Stage 4 was the last one. A place goes in when its section can do
      everything the place promises -- so a merchant never meets a choice that
      changes nothing, which is the complaint that started this work.
    */
    for (const slot of SLOTS.category) {
      // Card photos (2026-10-04) is the theme's own setting, not a section's.
      if (slot.inheritedFrom || slot.themeSetting) continue;
      expect(wiringFor("category", slot.key), slot.key).not.toBeNull();
    }
  });
});

describe("the path back up", () => {
  test("it is its own section, so turning it off leaves the heading alone", () => {
    expect(sectionTypesOf(place("breadcrumb"))).toEqual(["breadcrumb"]);
    expect(place("breadcrumb").off).toBe("off");
  });

  test("a page that has it reads as on, and one without reads as off", () => {
    expect(slotValueFor(PAGE().document, place("breadcrumb"))).toBe("on");
    const without = editor([section("head", "category_header")]);
    expect(slotValueFor(without.document, place("breadcrumb"))).toBe("off");
  });

  test("turning it off hides it rather than removing it", () => {
    const after = pick(PAGE(), "breadcrumb", "off");
    const crumb = sectionOfType(after.document, place("breadcrumb"), "breadcrumb");
    expect(crumb).not.toBeNull();
    expect(crumb?.hidden).toBe(true);
  });

  test("it is born at the top of the page when the document has none", () => {
    const bare = editor([section("head", "category_header"), section("grid", "product_grid")]);
    expect(placeFor(bare.document, "category", "breadcrumb", place("breadcrumb"))).toBe(0);
  });
});

describe("the heading and its count are one section", () => {
  test("both places point at it", () => {
    expect(sectionTypesOf(place("heading"))).toEqual(["category_header"]);
    expect(sectionTypesOf(place("count"))).toEqual(["category_header"]);
  });

  test("the heading has no off: a category page without a name is not a page", () => {
    expect(place("heading").off).toBeUndefined();
  });

  test("the count has no off either -- switching it off is a setting, not a missing section", () => {
    expect(place("count").off).toBeUndefined();
  });

  test("each of the three shapes is written to the section", () => {
    for (const shape of ["eyebrow", "banner", "plain"]) {
      const after = pick(PAGE(), "heading", shape);
      expect(sectionOfType(after.document, place("heading"), "category_header")?.settings.layout).toBe(
        shape,
      );
      expect(slotValueFor(after.document, place("heading"))).toBe(shape);
    }
  });

  test("turning the count on leaves the shape alone", () => {
    const banner = pick(PAGE(), "heading", "banner");
    const counted = pick(banner, "count", "on");
    const settings = sectionOfType(counted.document, place("heading"), "category_header")?.settings;
    expect(settings?.show_count).toBe(true);
    expect(settings?.layout).toBe("banner");
    expect(slotValueFor(counted.document, place("heading"))).toBe("banner");
  });

  test("and turning it off does not hide the heading", () => {
    const after = pick(pick(PAGE(), "count", "on"), "count", "off");
    const head = sectionOfType(after.document, place("heading"), "category_header");
    expect(head?.hidden).toBe(false);
    expect(head?.settings.show_count).toBe(false);
  });

  test("a shop that has never touched either reads as the theme's own defaults", () => {
    /*
      A document written before a setting existed carries none, and a missing
      setting reads as the first value that wants it -- so the theme's default
      has to come first in the wiring. Put `on` first and a shop showing no
      count would be told it shows one.
    */
    const page = PAGE();
    expect(slotValueFor(page.document, place("heading"))).toBe("plain");
    expect(slotValueFor(page.document, place("count"))).toBe("off");
    expect(slotValueFor(page.document, place("grid"))).toBe("four");
    expect(slotValueFor(page.document, place("more"))).toBe("pages");
    expect(slotValueFor(page.document, place("empty"))).toBe("text");
    expect(slotValueFor(page.document, place("sort"))).toBe("off");
  });
});

describe("the grid, its pages and its empty answer are one section", () => {
  test("all three places point at it", () => {
    for (const key of ["grid", "more", "empty"]) {
      expect(sectionTypesOf(place(key))).toEqual(["product_grid"]);
    }
  });

  test("how many across is written to the section", () => {
    for (const across of ["three", "two", "four"]) {
      const after = pick(PAGE(), "grid", across);
      expect(settingsOf(after, "product_grid").columns).toBe(across);
      expect(slotValueFor(after.document, place("grid"))).toBe(across);
    }
  });

  test("the three choices never overwrite each other", () => {
    const after = ["grid", "more", "empty"].reduce(
      (state, key) => pick(state, key, { grid: "two", more: "none", empty: "invite" }[key]!),
      PAGE(),
    );
    expect(settingsOf(after, "product_grid")).toMatchObject({
      columns: "two",
      more: "none",
      when_empty: "invite",
    });
  });

  test("the grid is never hidden, because the theme will not have it hidden", () => {
    /*
      `product_grid` is required. "Nothing" and "A line" are settings of it, not
      an absent section -- a category page without a product list is not a
      category page.
    */
    for (const key of ["grid", "more", "empty"]) {
      expect(place(key).off).toBeUndefined();
    }
    const after = pick(PAGE(), "more", "none");
    expect(sectionOfType(after.document, place("more"), "product_grid")?.hidden).toBe(false);
  });

  test("all three ways to the rest are offered, and each writes its own", () => {
    /*
      The button was taken out on 2026-09-23 because the shop could not draw
      one, and came back the same day with the script. A tile that changes
      nothing is the broken promise this stretch of work exists to end.
    */
    const slot = SLOTS.category.find((one) => one.key === "more")!;
    expect((slot.options ?? []).map((option) => option.value)).toEqual([
      "pages",
      "button",
      "none",
    ]);
    expect(Object.keys(place("more").sections)).toEqual(["pages", "button", "none"]);
    for (const answer of ["button", "none", "pages"]) {
      expect(settingsOf(pick(PAGE(), "more", answer), "product_grid").more).toBe(answer);
    }
  });

  test("numbered pages are what a page starts on", () => {
    const slot = SLOTS.category.find((one) => one.key === "more")!;
    expect(slot.initial).toBe("pages");
  });

  test("the empty answer is not called what Liquid calls nothing", () => {
    /*
      `empty` is a reserved word in Liquid, so a setting named it is a path no
      template can write -- the whole grid raised rather than drawing. Renamed
      in theming migration 0024; this is here so it never drifts back.
    */
    expect(Object.keys(place("empty").sections)).toEqual(["text", "invite"]);
    const after = pick(PAGE(), "empty", "invite");
    expect(settingsOf(after, "product_grid")).toMatchObject({ when_empty: "invite" });
    expect(settingsOf(after, "product_grid").empty).toBeUndefined();
  });
});

describe("words under the grid", () => {
  test("they are their own section and switch off", () => {
    expect(sectionTypesOf(place("text"))).toEqual(["rich_text"]);
    expect(place("text").off).toBe("off");
  });

  test("the block is born under the grid rather than at the top", () => {
    expect(placeFor(PAGE().document, "category", "text", place("text"))).toBe(3);
  });

  test("switching it off keeps the words a merchant wrote", () => {
    const written = editor([
      section("grid", "product_grid"),
      section("words", "rich_text", { settings: { heading: "About our bags" } }),
    ]);
    const after = pick(written, "text", "off");
    const words = sectionOfType(after.document, place("text"), "rich_text");
    expect(words?.hidden).toBe(true);
    expect(words?.settings.heading).toBe("About our bags");
  });
});

describe("one decision, one control", () => {
  /**
   * The rule the owner set on 2026-09-23 after meeting "Picture behind the
   * words" as a tile and a "Shape" dropdown under it saying the same thing.
   * Here it has to reach ACROSS places, because two of them share a section.
   */
  test("the heading's dialog draws neither its own shape nor the count's", () => {
    const decided = settingsDecidedOn("category", "category_header");
    expect([...decided].sort()).toEqual(["layout", "show_count"]);
  });

  test("the grid's dialog draws none of the four", () => {
    const decided = settingsDecidedOn("category", "product_grid");
    expect([...decided].sort()).toEqual([
      "columns",
      "filters",
      "more",
      "sort",
      "when_empty",
    ]);
  });

  test("a section whose place decides nothing still draws its fields", () => {
    /* The words block: its heading and body are typed, not picked from tiles. */
    expect([...settingsDecidedOn("category", "rich_text")]).toEqual([]);
  });

  test("every setting a place decides is one the theme actually offers", () => {
    /*
      A wiring naming a setting the manifest does not have is silent: the editor
      writes it, the API refuses the save, and the merchant is told nothing
      useful. Checked against the real manifest in `manifest-drift`.
    */
    for (const [type, spec] of Object.entries(manifest.sections)) {
      const offered = new Set(spec.settings.map((one) => one.id));
      for (const setting of settingsDecidedOn("category", type)) {
        expect(offered.has(setting), `${type}.${setting}`).toBe(true);
      }
    }
  });
});

describe("sorting", () => {
  test("it is the grid's setting, not a section of its own", () => {
    /*
      A control that reorders a list it is not part of could be dropped on a
      page with no list at all.
    */
    expect(sectionTypesOf(place("sort"))).toEqual(["product_grid"]);
    expect(place("sort").off).toBeUndefined();
  });

  test("each shape is written to the grid", () => {
    for (const shape of ["menu", "tabs", "off"]) {
      const after = pick(PAGE(), "sort", shape);
      expect(settingsOf(after, "product_grid").sort).toBe(shape);
      expect(slotValueFor(after.document, place("sort"))).toBe(shape);
    }
  });

  test("switching it on leaves how many across alone", () => {
    const after = pick(pick(PAGE(), "grid", "two"), "sort", "tabs");
    expect(settingsOf(after, "product_grid")).toMatchObject({ columns: "two", sort: "tabs" });
  });

  test("the grid's dialog draws none of the four it decides", () => {
    expect([...settingsDecidedOn("category", "product_grid")].sort()).toEqual([
      "columns",
      "filters",
      "more",
      "sort",
      "when_empty",
    ]);
  });

  test("off is what a shop that has never touched it reads as", () => {
    /* No shop's page moves under this. */
    const slot = SLOTS.category.find((one) => one.key === "sort")!;
    expect(slot.initial).toBe("off");
    expect(Object.keys(place("sort").sections)[0]).toBe("off");
  });
});

describe("filters", () => {
  test("they are the grid's setting, like sorting", () => {
    expect(sectionTypesOf(place("filters"))).toEqual(["product_grid"]);
    expect(place("filters").off).toBeUndefined();
  });

  test("each shape is written to the grid", () => {
    for (const shape of ["chips", "rail", "off"]) {
      const after = pick(PAGE(), "filters", shape);
      expect(settingsOf(after, "product_grid").filters).toBe(shape);
      expect(slotValueFor(after.document, place("filters"))).toBe(shape);
    }
  });

  test("off is what a shop that has never touched it reads as", () => {
    expect(slotValueFor(PAGE().document, place("filters"))).toBe("off");
    expect(Object.keys(place("filters").sections)[0]).toBe("off");
  });

  test("the two shapes are still spelled chips and rail in the document", () => {
    /*
      The BUTTON shape became a panel over the page on 2026-09-23 and its tile
      was renamed with it. The stored value did not change: renaming a value a
      shop has already saved is a migration, and this was a change of shape, not
      of meaning.
    */
    expect(Object.keys(place("filters").sections)).toEqual(["off", "chips", "rail"]);
  });

  test("switching them on leaves sorting and the columns alone", () => {
    const after = pick(pick(pick(PAGE(), "sort", "menu"), "grid", "two"), "filters", "rail");
    expect(settingsOf(after, "product_grid")).toMatchObject({
      sort: "menu",
      columns: "two",
      filters: "rail",
    });
  });
});
