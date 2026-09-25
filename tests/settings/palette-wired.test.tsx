/**
 * The palette, wired (owner, 2026-09-25): six palettes from the API in the
 * Style panel, picked into the shop's document, and a sketch that is drawn in
 * the shop's colours -- its brand colour on the buttons the shop fills with it,
 * its header on the header. The screen-wide "only these places save" note is
 * gone; the typeface, still not saved, says so where it is chosen.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import { ShopChrome } from "@/components/theme-editor/slots/ShopChrome";
import { StylePanel } from "@/components/theme-editor/slots/StylePanel";
import { editorReducer, initEditorState } from "@/lib/theme-editor/editor-reducer";
import type { ThemeEditorState } from "@/lib/theme-editor/api";
import { chosenPalette, type ShopPalette } from "@/lib/theme-editor/palettes";
import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

const palette = (key: string, name: string, name_bn: string, primary: string): ShopPalette => ({
  key,
  name,
  name_bn,
  tokens: { background: "#FBFAF7", muted: "#F2EFE9", border: "#E6E1D8", primary, foreground: "#161514" },
});

const SIX = [
  palette("porcelain", "Porcelain", "পোর্সেলিন", "#161514"),
  palette("sage", "Sage", "সেজ সবুজ", "#43594A"),
  palette("clay", "Clay", "পোড়ামাটি", "#A04A2A"),
  palette("rose", "Rosé", "গোলাপি", "#94425A"),
  palette("navy", "Navy", "নেভি নীল", "#1F2B48"),
  palette("emerald", "Emerald", "পান্না সবুজ", "#0E5A42"),
];

const noop = () => {};

function panel(props: Partial<Parameters<typeof StylePanel>[0]>, locale: "en" | "bn" = "en") {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : bn}>
      <StylePanel
        palettes={SIX}
        palettesFailed={false}
        palette="porcelain"
        onPalette={noop}
        face="poppins"
        onFace={noop}
        corner="soft"
        onCorner={noop}
        cardStyle="classic"
        onCardStyle={noop}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("the Style panel's colours", () => {
  test("offers the API's six, named in the dashboard's language, the chosen one pressed", () => {
    const html = panel({ palette: "sage" });
    for (const item of SIX) expect(html).toContain(item.name);
    expect(html.match(/aria-pressed="true"/g)?.length).toBeGreaterThanOrEqual(1);
    expect(html).toMatch(/aria-pressed="true"[^>]*>(?:(?!<\/button>)[\s\S])*Sage/);

    const bangla = panel({}, "bn");
    for (const item of SIX) expect(bangla).toContain(item.name_bn);
  });

  test("draws each palette's brand colour among its swatches", () => {
    const html = panel({});
    for (const item of SIX) expect(html.toLowerCase()).toContain(`background-color:${item.tokens.primary.toLowerCase()}`);
  });

  // The rendered HTML escapes an apostrophe, so the words are compared as HTML.
  const asHtml = (words: string) => words.replace(/'/g, "&#x27;");

  test("while they load, no palette to press; when they fail, a message instead", () => {
    const loading = panel({ palettes: undefined });
    for (const item of SIX) expect(loading).not.toContain(item.name);
    const failed = panel({ palettes: undefined, palettesFailed: true });
    expect(failed).toContain(asHtml(en.themeEditor.slots.palettesFailed));
    expect(failed).toContain('role="alert"');
  });

  test("the typeface says it is not saved yet, where it is chosen", () => {
    expect(panel({})).toContain(asHtml(en.themeEditor.slots.typeNotSavedYet));
  });
});

describe("picking a palette", () => {
  test("writes the shop's document, as a draft like every other look decision", () => {
    const loaded = {
      document: { theme: "storefront", settings: {}, templates: {}, groups: {} },
      // The theme's own `palette` setting, as the API's manifest offers it:
      // the editor accepts only a setting the theme offers, as the API does.
      manifest: {
        settings: [
          {
            id: "palette",
            type: "select",
            label: "Colours",
            label_bn: "রং",
            options: SIX.map((item) => item.key),
            option_labels: Object.fromEntries(SIX.map((item) => [item.key, { en: item.name, bn: item.name_bn }])),
            default: "porcelain",
          },
        ],
        sections: {},
        groups: {},
        templates: {},
      },
    } as unknown as ThemeEditorState;
    const before = initEditorState(loaded);
    expect(chosenPalette(before.document)).toBe("porcelain");
    const after = editorReducer(before, { type: "setThemeSetting", setting: "palette", value: "emerald" });
    expect(chosenPalette(after.document)).toBe("emerald");
  });
});

describe("the sketch in the shop's colours", () => {
  const draw = (page: string, slotKey: string, variant?: string) =>
    renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={en}>
        <ShopChrome page={page as never} slotKey={slotKey} variant={variant} />
      </NextIntlClientProvider>,
    );

  test("Add to cart and Checkout are the brand colour, as the shop's big buttons are", () => {
    expect(draw("product", "buy")).toContain("bg-shop-brand");
    expect(draw("cart", "total")).toContain("bg-shop-brand");
  });

  test("the header is the palette's header, and the notice strip its brand colour", () => {
    expect(draw("home", "header", "bar")).toContain("bg-shop-header");
    expect(draw("home", "header", "masthead")).toContain("bg-shop-header");
    expect(draw("home", "notice")).toContain("bg-shop-brand");
  });
});

describe("the screen-wide note", () => {
  test("is gone: every place on every page saves", () => {
    expect(en.themeEditor.slots).not.toHaveProperty("partlyWired");
    expect(bn.themeEditor.slots).not.toHaveProperty("partlyWired");
  });
});

describe("the typefaces, not wired yet (2026-09-26)", () => {
  test("are shown faded and cannot be clicked", () => {
    const html = panel({});
    const faces = html.match(/<button[^>]*aria-pressed[^>]*opacity-45[^>]*>/g) ?? [];
    expect(faces.length).toBeGreaterThan(0);
    for (const face of faces) expect(face).toContain("disabled");
    expect(html).toContain("Coming soon");
  });
});
