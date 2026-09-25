/**
 * The promotion: the one section a shop pays for.
 *
 * Three shapes of one section, like the category band's two -- a merchant is
 * choosing how their promotion LOOKS, not what it is, and two sections would
 * let them put two promotions on one page.
 *
 * Every shape is badged paid, because the SECTION is: the theme marks it
 * premium and the API strips it at serve time, so the drawing that badged only
 * two of four was telling an Essential shop it could have the other two.
 */
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { SLOTS, initialChoices } from "@/lib/theme-editor/slot-catalogue";
import { sectionFields } from "@/lib/theme-editor/field-specs";
import {
  choiceEdits,
  meaningOf,
  placeFor,
  sectionOfType,
  sectionTypesOf,
  settingEdits,
  slotValueFor,
  wiringFor,
} from "@/lib/theme-editor/slot-sections";
import en from "../../messages/en.json";

const PLACE = wiringFor("home", "promo")!;
const labels = (label: string) => ({ label, label_bn: `${label} (bn)` });

const manifest: ThemeManifest = {
  key: "storefront",
  name: "Storefront",
  name_bn: "স্টোরফ্রন্ট",
  category: null,
  settings: [],
  sections: {
    promo: {
      ...labels("Promotion"),
      premium: true,
      settings: [
        {
          id: "layout",
          type: "select",
          ...labels("Shape"),
          options: ["strip", "beside", "behind"],
          default: "strip",
        },
        { id: "image", type: "image", ...labels("Picture"), default: "" },
        { id: "eyebrow", type: "text", ...labels("Small line above"), default: "" },
        { id: "heading", type: "text", ...labels("Heading"), default: "" },
        { id: "body", type: "textarea", ...labels("Message"), default: "" },
        { id: "button_label", type: "text", ...labels("Button"), default: "" },
        { id: "button_link", type: "url", ...labels("Button goes to"), default: "" },
        { id: "show_countdown", type: "boolean", ...labels("Show a countdown"), default: false },
        { id: "starts_at", type: "datetime", ...labels("Starts"), default: "" },
        { id: "ends_at", type: "datetime", ...labels("Ends"), default: "" },
      ],
    },
    banner_slider: { ...labels("Banners"), settings: [] },
    category_products: { ...labels("Products by category"), settings: [] },
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
      sections: ["banner_slider", "category_products", "promo"],
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

const promo = (layout: string, over: Partial<ThemeSection> = {}) =>
  section("promo", "promo", {
    settings: { layout, heading: "Eid sale", image: "", ...(over.settings ?? {}) },
    ...over,
  });

const choose = (state: EditorState, value: string) =>
  choiceEdits(state.document, PLACE, value, { page: "home", key: "promo" }).reduce(
    editorReducer,
    state,
  );
const type = (state: EditorState, setting: string, value: unknown) =>
  settingEdits(state.document, PLACE, setting, value).reduce(editorReducer, state);

const layoutOf = (state: EditorState) =>
  sectionOfType(state.document, PLACE, "promo")?.settings.layout;

describe("what the place says it is", () => {
  test("one section, three shapes", () => {
    expect(sectionTypesOf(PLACE)).toEqual(["promo"]);
    expect(meaningOf(PLACE, "strip")).toEqual({ type: "promo", settings: { layout: "strip" } });
    expect(meaningOf(PLACE, "beside")?.settings).toEqual({ layout: "beside" });
    expect(meaningOf(PLACE, "behind")?.settings).toEqual({ layout: "behind" });
  });

  test("the shape is what tells the three values apart", () => {
    for (const shape of ["strip", "beside", "behind"]) {
      expect(slotValueFor(editor([promo(shape)]).document, PLACE)).toBe(shape);
    }
  });

  test("a hidden promotion reads as nothing, whatever shape it was", () => {
    const off = editor([promo("behind", { hidden: true })]);
    expect(slotValueFor(off.document, PLACE)).toBe("none");
  });

  test("every shape is badged paid, because the section is", () => {
    const slot = SLOTS.home.find((one) => one.key === "promo")!;
    const shapes = (slot.options ?? []).filter((option) => option.value !== "none");
    expect(shapes).toHaveLength(3);
    expect(shapes.every((option) => option.premium)).toBe(true);
    expect(manifest.sections.promo.premium).toBe(true);
  });

  test("a shop starts with none, and nothing is drawn until they write one", () => {
    expect(initialChoices("home").promo).toBe("none");
    expect(slotValueFor(editor([]).document, PLACE)).toBe("none");
  });
});

describe("editing it", () => {
  test("a page with none gets the promotion already in the shape asked for", () => {
    const after = choose(editor([]), "behind");
    expect(layoutOf(after)).toBe("behind");
  });

  test("switching shape keeps every word the merchant wrote", () => {
    const written = type(type(editor([promo("strip")]), "heading", "Eid sale"), "body", "40% off");
    const asPhoto = choose(written, "behind");
    expect(layoutOf(asPhoto)).toBe("behind");
    expect(sectionOfType(asPhoto.document, PLACE, "promo")?.settings.body).toBe("40% off");
  });

  test("taking it down hides it rather than removing it", () => {
    /*
      A merchant who takes a sale down for a fortnight keeps the words, the
      picture and the dates they wrote -- the same rule the notice strip has.
    */
    const off = choose(editor([promo("beside")]), "none");
    const held = sectionOfType(off.document, PLACE, "promo");
    expect(held?.hidden).toBe(true);
    expect(held?.settings.heading).toBe("Eid sale");
  });

  test("it lands under the per-category rows, where the editor lists it", () => {
    const page = editor([
      section("hero", "banner_slider"),
      section("bands", "category_products"),
    ]);
    expect(placeFor(page.document, "home", "promo", PLACE)).toBe(2);
  });
});

describe("the pop-up asks each thing once", () => {
  /**
   * The owner, looking at the promotion's pop-up on 2026-09-23: the tiles said
   * "Picture behind the words" and a dropdown under them said the same thing,
   * and every tile carried "· Premium".
   *
   * A place whose choices ARE shapes of one section decides that section's
   * shape with its tiles; drawing the setting again as a field is one decision
   * with two controls, and they can disagree in front of the merchant.
   */
  test("the shape the tiles decide is not also a field", () => {
    const decided = new Set(
      Object.keys(PLACE.sections).flatMap((value) =>
        Object.keys(meaningOf(PLACE, value)?.settings ?? {}),
      ),
    );
    expect([...decided]).toEqual(["layout"]);

    const fields = sectionFields(manifest, "promo", "en").map((field) => field.id);
    const drawn = fields.filter((id) => !decided.has(id));
    expect(fields).toContain("layout");
    expect(drawn).not.toContain("layout");
    // And everything a merchant DOES type is still asked for.
    expect(drawn).toEqual([
      "image",
      "eyebrow",
      "heading",
      "body",
      "button_label",
      "button_link",
      "show_countdown",
      "starts_at",
      "ends_at",
    ]);
  });

  test("the same rule covers the category band, which had it too", () => {
    const band = wiringFor("home", "categories")!;
    const decided = new Set(
      Object.keys(band.sections).flatMap((value) =>
        Object.keys(meaningOf(band, value)?.settings ?? {}),
      ),
    );
    expect([...decided]).toEqual(["layout"]);
  });

  test("every shape being paid is a fact about the place, not about a tile", () => {
    const slot = SLOTS.home.find((one) => one.key === "promo")!;
    const shapes = (slot.options ?? []).filter((option) => option.value !== PLACE.off);
    expect(shapes.every((option) => option.premium)).toBe(true);
    // Said once under the row. The words exist in both languages; the copy
    // test is what proves that.
    expect(en.themeEditor.slots.placeIsPaid).toBeTruthy();
  });

  test("the tiles say what they are in two or three words", () => {
    /*
      Four tiles share one row, so a label that runs to three lines is a tile
      nobody can read at a glance -- which is what "Picture beside the words ·
      Premium" did.
    */
    const slot = SLOTS.home.find((one) => one.key === "promo")!;
    for (const option of slot.options ?? []) {
      const words = (en.themeEditor.slots as Record<string, string>)[option.label] ?? option.label;
      expect(words.split(/\s+/).length, words).toBeLessThanOrEqual(3);
    }
  });
});

