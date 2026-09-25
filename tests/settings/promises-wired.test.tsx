/**
 * The Promises place: four out of sixteen, ticked.
 *
 * Two things it is the first to do. Its parts are ticked from the THEME's own
 * list rather than from the shop's catalogue -- the featured band searches
 * products, and sixteen fixed words need no search. And it is picked on one
 * page and drawn on two: the product page's Promises is an inherited place
 * pointing back here, the way the notice strip is owned by the Header entry.
 */
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { blockFields } from "@/lib/theme-editor/field-specs";
import { SLOTS } from "@/lib/theme-editor/slot-catalogue";
import {
  choiceEdits,
  meaningOf,
  ownerOf,
  placeFor,
  sectionOfType,
  sectionTypesOf,
  setBlocksEdits,
  slotValueFor,
  wiringFor,
} from "@/lib/theme-editor/slot-sections";

const PLACE = wiringFor("home", "trust")!;
const labels = (label: string) => ({ label, label_bn: `${label} (bn)` });

const SIXTEEN = [
  "fast_delivery",
  "free_delivery",
  "dhaka_24_hours",
  "all_over_bangladesh",
  "cash_on_delivery",
  "secure_payment",
  "mobile_payment",
  "pay_your_way",
  "easy_returns",
  "exchange_in_7_days",
  "check_before_paying",
  "genuine_product",
  "quality_checked",
  "warranty_included",
  "help_every_day",
  "reply_within_an_hour",
];

const manifest: ThemeManifest = {
  key: "storefront",
  name: "Storefront",
  name_bn: "স্টোরফ্রন্ট",
  category: null,
  settings: [],
  sections: {
    promises: {
      ...labels("Promises"),
      max_blocks: 4,
      settings: [
        { id: "layout", type: "select", ...labels("Shape"), options: ["marks", "line"], default: "marks" },
      ],
      blocks: {
        promise: {
          ...labels("Promise"),
          settings: [
            {
              id: "promise",
              type: "select",
              ...labels("Promise"),
              options: SIXTEEN,
              option_labels: Object.fromEntries(
                SIXTEEN.map((name) => [name, { en: name, bn: `${name} (bn)` }]),
              ),
              default: SIXTEEN[0],
            },
          ],
        },
      },
    },
    banner_slider: { ...labels("Banners"), settings: [] },
    category_tiles: { ...labels("Shop by category"), settings: [] },
    header: { ...labels("Header"), at_most_one: true, required: true, settings: [] },
    footer: { ...labels("Footer"), at_most_one: true, required: true, settings: [] },
  },
  groups: {
    header: { ...labels("Header"), sections: ["header"], default: [] },
    footer: { ...labels("Footer"), sections: ["footer"], default: [] },
  },
  templates: {
    home: {
      ...labels("Home"),
      sections: ["banner_slider", "category_tiles", "promises"],
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
      templates: { home: { sections } },
    } as unknown as ThemeDocument,
    manifest,
    draft_revision: 1,
    has_draft: false,
  } as unknown as ThemeEditorState);
}

const band = (layout: string, promises: string[] = [], over: Partial<ThemeSection> = {}) =>
  section("promises", "promises", {
    settings: { layout },
    blocks: promises.map((name, index) => ({
      id: `promise-${index + 1}`,
      type: "promise",
      settings: { promise: name },
    })),
    ...over,
  });

const choose = (state: EditorState, value: string) =>
  choiceEdits(state.document, PLACE, value, { page: "home", key: "trust" }).reduce(
    editorReducer,
    state,
  );
const tick = (state: EditorState, values: string[]) =>
  setBlocksEdits(state.document, PLACE, "promise", "promise", values).reduce(editorReducer, state);

const picked = (state: EditorState) =>
  (sectionOfType(state.document, PLACE, "promises")?.blocks ?? []).map(
    (block) => block.settings.promise,
  );

describe("what the place says it is", () => {
  test("one section, two shapes", () => {
    expect(sectionTypesOf(PLACE)).toEqual(["promises"]);
    expect(meaningOf(PLACE, "icons")).toEqual({ type: "promises", settings: { layout: "marks" } });
    expect(meaningOf(PLACE, "line")?.settings).toEqual({ layout: "line" });
  });

  test("the shape is what tells the two values apart", () => {
    expect(slotValueFor(editor([band("marks")]).document, PLACE)).toBe("icons");
    expect(slotValueFor(editor([band("line")]).document, PLACE)).toBe("line");
  });

  test("a hidden band reads as off, whatever shape it was", () => {
    expect(slotValueFor(editor([band("marks", [], { hidden: true })]).document, PLACE)).toBe("off");
  });

  test("a page with no promises at all reads as off, not as broken", () => {
    expect(slotValueFor(editor([]).document, PLACE)).toBe("off");
  });
});

describe("picking them", () => {
  test("a page with none gets the band already in the shape that was asked for", () => {
    const after = choose(editor([]), "line");
    expect(sectionOfType(after.document, PLACE, "promises")?.settings.layout).toBe("line");
  });

  test("it lands under the departments, where the editor lists it", () => {
    const page = editor([section("hero", "banner_slider"), section("cats", "category_tiles")]);
    expect(placeFor(page.document, "home", "trust", PLACE)).toBe(2);
  });

  test("four are ticked in one go, in the order they were ticked", () => {
    const after = tick(editor([band("marks")]), [
      "cash_on_delivery",
      "easy_returns",
      "help_every_day",
      "fast_delivery",
    ]);
    expect(picked(after)).toEqual([
      "cash_on_delivery",
      "easy_returns",
      "help_every_day",
      "fast_delivery",
    ]);
  });

  test("unticking one leaves the rest alone", () => {
    const four = tick(editor([band("marks")]), ["cash_on_delivery", "easy_returns"]);
    expect(picked(tick(four, ["cash_on_delivery"]))).toEqual(["cash_on_delivery"]);
  });

  test("switching shape keeps what was ticked", () => {
    /*
      Two shapes of one section, so the promises are the SECTION's and survive
      a merchant trying the other look. A second section would lose them.
    */
    const marks = tick(editor([band("marks")]), ["genuine_product", "warranty_included"]);
    const asLine = choose(marks, "line");
    expect(sectionOfType(asLine.document, PLACE, "promises")?.settings.layout).toBe("line");
    expect(picked(asLine)).toEqual(["genuine_product", "warranty_included"]);
  });
});

describe("the checklist the dialog draws", () => {
  test("every one of the sixteen is offered, in the merchant's language", () => {
    const fields = blockFields(manifest, "promises", "promise", "en");
    expect(fields).toHaveLength(1);
    expect(fields[0].kind).toBe("select");
    expect(fields[0].options.map((option) => option.value)).toEqual(SIXTEEN);
    expect(fields[0].options.every((option) => option.label.length > 0)).toBe(true);
  });

  test("one setting, and it is a choice -- which is what makes it a ticklist", () => {
    /*
      The rule the dialog follows: ONE setting that is a choice is ticked; a
      part that is a form stays a form. Written here so a second setting added
      to a promise turns the screen into a form on purpose rather than by
      accident.
    */
    const specs = manifest.sections.promises.blocks!.promise.settings;
    expect(specs).toHaveLength(1);
    expect(specs[0].type).toBe("select");
  });
});

describe("the product page shows the same four", () => {
  test("its Promises place is inherited from Home", () => {
    const slot = SLOTS.product.find((one) => one.key === "trust")!;
    expect(ownerOf("product", slot)).toEqual({ page: "home", key: "trust" });
  });

  test("and it is the Home place that holds them", () => {
    const slot = SLOTS.product.find((one) => one.key === "trust")!;
    const owner = ownerOf("product", slot);
    expect(wiringFor(owner.page, owner.key)).toBe(PLACE);
  });
});
