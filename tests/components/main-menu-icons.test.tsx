/**
 * The main menu draws hollow Phosphor icons (owner, 2026-10-07: tried filled, then "make them un
 * filled across all the menu"), in the slim strip and the open sidebar, for plain rows and groups.
 */
import { renderToStaticMarkup } from "react-dom/server";
import type { Icon } from "@phosphor-icons/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/navigation/DeferredNavLink", () => ({
  DeferredNavLink: ({ href, onNavigate: _onNavigate, ...props }: Record<string, unknown>) => (
    <a href={String(href)} {...(props as object)} />
  ),
}));

import AppSidebarNav from "@/components/sidebar/AppSidebarNav";
import { SidebarShopLinks } from "@/components/sidebar/SidebarShopLinks";
import { MAIN_NAV_APP_ICONS, NAV_ICONS } from "@/components/sidebar/nav-icons";
import { MAIN_NAV_APP_IDS } from "@/config/apps";
import en from "../../messages/en.json";

const drawMenu = (collapsed: boolean) =>
  renderToStaticMarkup(
    <AppSidebarNav
      collapsed={collapsed}
      pathname="/"
      shouldPrefetchLinks={false}
      onNavigate={() => {}}
      tNavLabel="Menu"
      tCatalogLabel="Catalog"
      tMoreLabel="More"
      tAppLabel={(id) => id}
      counts={null}
      formatCount={String}
      numClass=""
      homeHref="/"
      catalogLinks={["products"]}
      // Customers as a group, so the group row's icon is checked too.
      navChildren={{ customers: ["customers", "accounts"] }}
      openChildren={new Set()}
      onSetChildrenOpen={() => {}}
      showCatalog
      catalogChildActive={false}
      catalogOpen={false}
      setCatalogOpen={() => {}}
      showMore
      moreLinks={["trash"]}
      moreChildActive={false}
      celeryOpen={false}
      setCeleryOpen={() => {}}
      inventoryNavStatus="none"
      mainNavSequence={[MAIN_NAV_APP_IDS[0], "__catalog__", ...MAIN_NAV_APP_IDS.slice(1)]}
    />
  );

const drawShopLinks = () =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Dhaka">
      <SidebarShopLinks collapsed storefrontUrl="https://gadzilla.paperbase.me" hasSettings settingsActive={false} />
    </NextIntlClientProvider>
  );

/** The glyph's drawing, which is what differs between Phosphor's weights. */
const glyph = (Glyph: Icon, weight: "fill" | "regular") =>
  renderToStaticMarkup(<Glyph weight={weight} />).match(/<svg[^>]*>(.*)<\/svg>/)![1];

const menuIcons = [
  NAV_ICONS.home,
  NAV_ICONS.catalog,
  NAV_ICONS.more,
  ...MAIN_NAV_APP_IDS.map((id) => MAIN_NAV_APP_ICONS[id]),
];

describe("the main menu's icons", () => {
  it.each([true, false])("are hollow, never filled (collapsed: %s)", (collapsed) => {
    const html = drawMenu(collapsed);
    for (const Glyph of menuIcons) {
      expect(html).toContain(glyph(Glyph, "regular"));
      expect(html).not.toContain(glyph(Glyph, "fill"));
    }
  });

  it("has one for every row, and nothing else in the strip", () => {
    const html = drawMenu(true);
    expect(html.match(/<svg/g)).toHaveLength(menuIcons.length);
    expect(html).not.toContain('class="lucide');
  });

  it("hides them from screen readers, which read the row's name", () => {
    const svgs = drawMenu(true).match(/<svg[^>]*>/g)!;
    expect(svgs.every((svg) => svg.includes('aria-hidden="true"'))).toBe(true);
  });

  it("draws View my shop and Settings under the menu hollow too", () => {
    const html = drawShopLinks();
    for (const Glyph of [NAV_ICONS.viewMyShop, NAV_ICONS.settings]) {
      expect(html).toContain(glyph(Glyph, "regular"));
      expect(html).not.toContain(glyph(Glyph, "fill"));
    }
  });
});
