/**
 * The sidebar's foot (owner, 2026-10-07): View my shop, opening the live shop in a new tab, and
 * Settings, moved out of the account menu, pinned under the main menu for everyone on the team.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/navigation/DeferredNavLink", () => ({
  DeferredNavLink: ({ href, onNavigate: _onNavigate, ...props }: Record<string, unknown>) => (
    <a href={String(href)} {...(props as object)} />
  ),
}));

import { SidebarShopLinks } from "@/components/sidebar/SidebarShopLinks";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

const SHOP = "https://gadzilla.paperbase.me";

const draw = (props: Partial<Parameters<typeof SidebarShopLinks>[0]>, locale: "en" | "bn" = "en") =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : bn} timeZone="Asia/Dhaka">
      <SidebarShopLinks collapsed={false} storefrontUrl={SHOP} settingsActive={false} {...props} />
    </NextIntlClientProvider>
  );

describe("the sidebar's shop links", () => {
  it("opens the live shop in a new tab, then Settings", () => {
    const html = draw({});
    expect(html).toContain(`href="${SHOP}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain(`aria-label="${en.nav.viewMyShopAria}"`);
    expect(html).toContain('href="/settings"');
    expect(html.indexOf(en.nav.viewMyShop)).toBeLessThan(html.indexOf(en.common.settings));
  });

  it("waits for the shop's address before offering it", () => {
    const html = draw({ storefrontUrl: "" });
    expect(html).not.toContain(en.nav.viewMyShop);
    expect(html).toContain('href="/settings"');
  });

  it("marks Settings while it is open", () => {
    expect(draw({ settingsActive: true })).toContain('aria-current="page"');
    expect(draw({})).not.toContain('aria-current="page"');
  });

  it("names both in the slim icon strip, where there is no text", () => {
    const html = draw({ collapsed: true });
    expect(html).toContain(`title="${en.nav.viewMyShop}"`);
    expect(html).toContain(`title="${en.common.settings}"`);
    expect(html).not.toContain('class="truncate"');
  });

  it("speaks Bangla", () => {
    const html = draw({}, "bn");
    expect(html).toContain(bn.nav.viewMyShop);
    expect(html).toContain(bn.common.settings);
  });

  it("is no longer in the account menu", () => {
    const sidebar = readFileSync(path.join(__dirname, "../../src/components/Sidebar.tsx"), "utf8");
    expect(sidebar).not.toContain('href="/settings"');
    expect(sidebar).toContain("<SidebarShopLinks");
  });

  it("stays out of the Settings menu, which has its own way back", () => {
    const sidebar = readFileSync(path.join(__dirname, "../../src/components/Sidebar.tsx"), "utf8");
    expect(sidebar).toMatch(/navVariant !== "settings" && \(\s*<SidebarShopLinks/);
  });
});
