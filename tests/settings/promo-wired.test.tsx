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
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { ShopChrome } from "@/components/theme-editor/slots/ShopChrome";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { SLOTS, initialChoices } from "@/lib/theme-editor/slot-catalogue";
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

  test("it lands under the per-category rows, where the canvas draws it", () => {
    const page = editor([
      section("hero", "banner_slider"),
      section("bands", "category_products"),
    ]);
    expect(placeFor(page.document, "home", "promo", PLACE)).toBe(2);
  });
});

describe("the canvas draws the merchant's own", () => {
  const draw = (variant: string, live?: ThemeSection) =>
    renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={en}>
        <ShopChrome
          page="home"
          slotKey="promo"
          variant={variant}
          settings={initialChoices("home")}
          live={live as never}
          pictureUrl={(key) => (key ? `https://cdn.example.com/${key}` : "")}
        />
      </NextIntlClientProvider>,
    );

  test("their words, not an example, once they have written any", () => {
    const html = draw(
      "strip",
      promo("strip", {
        settings: {
          layout: "strip",
          heading: "Eid sale, 40% off",
          eyebrow: "Limited time",
          button_label: "Shop the sale",
        },
      }),
    );
    expect(html).toContain("Eid sale, 40% off");
    expect(html).toContain("Limited time");
    expect(html).toContain("Shop the sale");
    expect(html).not.toContain(en.themeEditor.slots.promoTextExample);
  });

  test("an example until they have", () => {
    expect(draw("strip")).toContain(en.themeEditor.slots.promoTextExample);
  });

  test("the picture they chose, where the shape puts it", () => {
    const withPhoto = promo("behind", {
      settings: { layout: "behind", heading: "Eid sale", image: "tenants/x/themes/p.jpg" },
    });
    expect(draw("behind", withPhoto)).toContain("https://cdn.example.com/tenants/x/themes/p.jpg");
  });

  test("and the plain band when a shape that needs a picture has none", () => {
    /*
      The shop falls back to the strip, so the drawing has to fall back with it
      -- a canvas that shows a photo layout the page will not draw is a canvas
      that lies.
    */
    const html = draw("behind", promo("behind", { settings: { layout: "behind", heading: "Eid sale" } }));
    expect(html).not.toContain("<img");
  });

  test("the countdown only when it is asked for and has an end to count to", () => {
    const ends = "2026-09-30T18:00:00Z";
    const example = en.themeEditor.slots.promoCountdownExample;
    const asked = (settings: Record<string, unknown>) =>
      draw("strip", promo("strip", { settings: { layout: "strip", heading: "Sale", ...settings } }));
    expect(asked({ show_countdown: true, ends_at: ends })).toContain(example);
    expect(asked({ show_countdown: true })).not.toContain(example);
    expect(asked({ ends_at: ends })).not.toContain(example);
  });
});
