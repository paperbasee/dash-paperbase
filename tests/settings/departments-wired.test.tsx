/**
 * The three departments on the home page.
 *
 * The first place with ONE answer: the theme marks the section required, so it
 * cannot be turned off, and what a merchant decides is which three departments
 * -- not whether there are any. That is why it offers no choices at all, and
 * why the pop-up draws no chooser above them.
 *
 * It is also the first ticked list whose options come from the SHOP rather than
 * from the theme: no theme can know what a merchant called their aisles.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import { ChoicePicker } from "@/components/theme-editor/ChoicePicker";
import en from "../../messages/en.json";

import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { blockFields } from "@/lib/theme-editor/field-specs";
import { SLOTS } from "@/lib/theme-editor/slot-catalogue";
import {
  placeFor,
  sectionOfType,
  sectionTypesOf,
  setBlocksEdits,
  slotValueFor,
  wiringFor,
} from "@/lib/theme-editor/slot-sections";

const PLACE = wiringFor("home", "bands")!;
const labels = (label: string) => ({ label, label_bn: `${label} (bn)` });

const manifest: ThemeManifest = {
  key: "storefront",
  name: "Storefront",
  name_bn: "স্টোরফ্রন্ট",
  category: null,
  settings: [],
  sections: {
    category_products: {
      ...labels("Products by category"),
      required: true,
      max_blocks: 3,
      settings: [],
      blocks: {
        band: {
          ...labels("Department"),
          settings: [{ id: "category", type: "category", ...labels("Department"), default: "" }],
        },
      },
    },
    banner_slider: { ...labels("Banners"), settings: [] },
    category_tiles: { ...labels("Shop by category"), settings: [] },
    featured_products: { ...labels("Featured"), settings: [] },
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
      sections: ["banner_slider", "category_tiles", "featured_products", "category_products"],
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

const CAT = (n: number) => `cat_${n.toString(16).padStart(20, "0")}`;

const bands = (picks: string[] = []) =>
  section("bands", "category_products", {
    blocks: picks.map((id, index) => ({
      id: `band-${index + 1}`,
      type: "band",
      settings: { category: id },
    })),
  });

const tick = (state: EditorState, values: string[]) =>
  setBlocksEdits(state.document, PLACE, "band", "category", values).reduce(editorReducer, state);

const picked = (state: EditorState) =>
  (sectionOfType(state.document, PLACE, "category_products")?.blocks ?? []).map(
    (block) => block.settings.category,
  );

describe("a place with one answer", () => {
  test("it is one section and there is nothing to turn off", () => {
    expect(sectionTypesOf(PLACE)).toEqual(["category_products"]);
    expect(PLACE.off).toBeUndefined();
  });

  test("the canvas offers no choices, so the pop-up draws no chooser", () => {
    const slot = SLOTS.home.find((one) => one.key === "bands")!;
    expect(slot.options ?? []).toEqual([]);
    expect(slot.locked).toBeUndefined();
  });

  test("a page that has it reads as on", () => {
    expect(slotValueFor(editor([bands()]).document, PLACE)).toBe("on");
  });
});

describe("picking three", () => {
  test("ticked in one go, in the order they were ticked", () => {
    const after = tick(editor([bands()]), [CAT(2), CAT(1), CAT(3)]);
    expect(picked(after)).toEqual([CAT(2), CAT(1), CAT(3)]);
  });

  test("unticking one leaves the rest alone", () => {
    const three = tick(editor([bands()]), [CAT(1), CAT(2), CAT(3)]);
    expect(picked(tick(three, [CAT(1), CAT(3)]))).toEqual([CAT(1), CAT(3)]);
  });

  test("the part is one setting and it is a department, which is what makes it a ticklist", () => {
    const fields = blockFields(manifest, "category_products", "band", "en");
    expect(fields).toHaveLength(1);
    expect(fields[0].kind).toBe("category");
    // No options of its own: the shop's departments are handed to the picker.
    expect(fields[0].options).toEqual([]);
  });

  test("it sits under the featured band, where the canvas draws it", () => {
    const page = editor([
      section("hero", "banner_slider"),
      section("cats", "category_tiles"),
      section("featured", "featured_products"),
    ]);
    expect(placeFor(page.document, "home", "bands", PLACE)).toBe(3);
  });
});

describe("an empty department says so", () => {
  /**
   * The owner ticked three and the page drew one: two of their departments had
   * no products, and the shop skips a department with nothing in it rather
   * than drawing a heading over a blank space. The checklist says which those
   * are now -- and still lets them be ticked, because a merchant setting a
   * shop up picks the aisle they are about to fill.
   */
  const options = [
    { value: CAT(1), label: "Men" },
    { value: CAT(2), label: "Audio", note: "No products" },
  ];
  const draw = (value: string[] = []) =>
    renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={en}>
        <ChoicePicker
          open
          options={options}
          value={value}
          most={3}
          onDone={() => {}}
          onClose={() => {}}
        />
      </NextIntlClientProvider>,
    );

  test("the note is drawn beside the name", () => {
    const html = draw();
    expect(html).toContain("Audio");
    expect(html).toContain("No products");
  });

  test("and it does not stop the tick", () => {
    /*
      The only thing that disables a box is the CAP, and three is the cap here
      with nothing ticked. A note is a word, not a lock: a merchant setting a
      shop up ticks the aisle they are about to fill.
    */
    // The boxes, not the Done button -- whose CSS classes say "disabled" for a
    // state it is not in.
    const boxes = (html: string) => html.match(/<input[^>]*disabled/g);
    expect(boxes(draw())).toBeNull();
    // At the cap, the unticked ones close -- which is the cap talking, not the
    // note: the department with products closes too.
    const full = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={en}>
        <ChoicePicker
          open
          options={[...options, { value: CAT(3), label: "Kids" }]}
          value={[CAT(1), CAT(2), CAT(3)]}
          most={3}
          onDone={() => {}}
          onClose={() => {}}
        />
      </NextIntlClientProvider>,
    );
    expect(boxes(full)).toBeNull();
  });

  test("a department with products carries no note", () => {
    const html = draw();
    const men = html.slice(0, html.indexOf("Audio"));
    expect(men).toContain("Men");
    expect(men).not.toContain("No products");
  });
});
