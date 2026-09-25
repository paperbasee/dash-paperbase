/**
 * The home page's band titles in the editor's sketch, drawn as the shop draws
 * them (owner, 2026-09-25): centred, in capitals, light, the link under them --
 * and with the shop's own words: the merchant's heading, or for Best sellers and
 * New arrivals their own name when the merchant wrote none.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import { ShopChrome } from "@/components/theme-editor/slots/ShopChrome";
import en from "../../messages/en.json";

const draw = (slotKey: string, heading?: string) =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      <ShopChrome
        page="home"
        slotKey={slotKey}
        variant={undefined}
        live={{ id: "s", type: "x", settings: heading === undefined ? {} : { heading } } as never}
      />
    </NextIntlClientProvider>,
  );

describe("home band titles in the sketch", () => {
  test("centred, in capitals, light, with the link under the title", () => {
    const html = draw("bestsellers", "Top picks");
    expect(html).toContain("items-center");
    expect(html).toContain("font-light uppercase");
    expect(html.indexOf("Top picks")).toBeLessThan(html.indexOf(en.themeEditor.slots.browseAll));
  });

  test("best sellers and new arrivals say their own name when left untitled", () => {
    expect(draw("bestsellers", "")).toContain(en.themeEditor.slots.bestsellersHeading);
    expect(draw("arrivals", "")).toContain(en.themeEditor.slots.arrivalsHeading);
  });

  test("the featured band shows the merchant's own title, or only its link", () => {
    expect(draw("featured", "Featured This Week")).toContain("Featured This Week");
    const untitled = draw("featured", "");
    expect(untitled).not.toContain("<h4");
    expect(untitled).toContain(en.themeEditor.slots.browseAll);
  });
});
