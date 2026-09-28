/**
 * Three look choices the owner asked for on 2026-09-29, each a default that draws what the shop
 * drew before:
 *
 *   where a card's words sit      left, centre or right, once for every card (the Style panel)
 *   the message above Place order  left, centre or right, a field of its place; the box glows
 *   the receipt's own words        bold, three sizes, the shop's own colour behind them
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import { CARD_ALIGNS } from "@/components/theme-editor/slots/style-catalogue";
import { StylePanel } from "@/components/theme-editor/slots/StylePanel";
import { wiringFor } from "@/lib/theme-editor/slot-sections";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const THEME = path.resolve(ROOT, "../api-paperbase/engine/apps/theming/themes/storefront.json");

const noop = () => {};

function panel(cardAlign: string) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      <StylePanel
        palettes={[]}
        palettesFailed={false}
        palette="porcelain"
        onPalette={noop}
        face="poppins"
        corner="soft"
        onCorner={noop}
        cardStyle="shelf"
        onCardStyle={noop}
        cardAlign={cardAlign}
        onCardAlign={noop}
      />
    </NextIntlClientProvider>,
  );
}

describe("where a card's words sit", () => {
  test("three answers in the Style panel, in both languages", () => {
    const html = panel("center");
    expect(html).toContain(en.themeEditor.slots.cardAlign);
    for (const item of CARD_ALIGNS) {
      expect((en.themeEditor.slots as Record<string, string>)[item.label], item.key).toBeTruthy();
      expect((bn.themeEditor.slots as Record<string, string>)[item.label], item.key).toBeTruthy();
      expect(html).toContain(en.themeEditor.slots[item.label as keyof typeof en.themeEditor.slots]);
    }
  });

  test("the card drawings line their words up the way the shop will", () => {
    // The Card style tiles: the shop's card, drawn small, its words where the shop will put them.
    const card = (html: string) => html.match(/p-1 pb-1\.5 (items-\w+)/g) ?? [];
    expect(card(panel("left"))).toEqual(["p-1 pb-1.5 items-start", "p-1 pb-1.5 items-start"]);
    expect(card(panel("right"))).toEqual(["p-1 pb-1.5 items-end", "p-1 pb-1.5 items-end"]);
    // Anything else is the theme's default, centred.
    expect(card(panel("sideways"))).toEqual(["p-1 pb-1.5 items-center", "p-1 pb-1.5 items-center"]);
  });

  test.skipIf(!fs.existsSync(THEME))("the theme's own answers, centred to begin with", () => {
    const manifest = JSON.parse(fs.readFileSync(THEME, "utf8"));
    const spec = manifest.settings.find((one: { id: string }) => one.id === "card_align");
    expect(spec.options).toEqual(CARD_ALIGNS.map((item) => item.key));
    expect(spec.default).toBe("center");
  });
});

describe("the fields each place owns", () => {
  test("the message above the button sits where the merchant puts it, for both shapes", () => {
    expect(wiringFor("checkout", "beforePay")?.fields).toEqual(["before_pay_text", "before_pay_align"]);
  });

  test("the receipt's own words: the words, then bold, their size and what is behind them", () => {
    expect(wiringFor("success", "top")?.fields).toEqual(["top_text", "top_bold", "top_size", "top_background"]);
  });

  test.skipIf(!fs.existsSync(THEME))("every field is one the theme offers", () => {
    const manifest = JSON.parse(fs.readFileSync(THEME, "utf8"));
    const ids = (section: string) => manifest.sections[section].settings.map((one: { id: string }) => one.id);
    for (const field of wiringFor("checkout", "beforePay")?.fields ?? []) expect(ids("checkout")).toContain(field);
    for (const field of wiringFor("success", "top")?.fields ?? []) expect(ids("success")).toContain(field);
  });
});
