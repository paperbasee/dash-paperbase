/**
 * The settings menu draws hollow Phosphor icons like the main menu's (owner, 2026-10-07: "make them
 * un filled across all the menu"): in the sidebar and in the phone's tab list.
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

// Every section, whatever the role or plan: the icons are what is checked here.
vi.mock("@/app/[locale]/(dashboard)/settings/useVisibleSettingsSections", async () => {
  const { ALL_SECTIONS } = await import("@/app/[locale]/(dashboard)/settings/settingsSections");
  return { useVisibleSettingsSections: () => ALL_SECTIONS };
});

import SettingsSidebarNav from "@/components/sidebar/SettingsSidebarNav";
import { SettingsSectionNav } from "@/app/[locale]/(dashboard)/settings/SettingsNav";
import { ALL_SECTIONS } from "@/app/[locale]/(dashboard)/settings/settingsSections";
import en from "../../messages/en.json";

const drawSidebar = (collapsed: boolean) =>
  renderToStaticMarkup(
    <SettingsSidebarNav
      collapsed={collapsed}
      pathname="/settings"
      settingsTab="store"
      shouldPrefetchLinks={false}
      onNavigate={() => {}}
      tCommonSettingsLabel="Settings"
      tBackToHomeLabel="Back to home"
      tSettings={(key) => key}
    />
  );

const drawPhoneTabs = () =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Dhaka">
      <SettingsSectionNav activeSection="store" onSelect={() => {}} />
    </NextIntlClientProvider>
  );

/** The glyph's drawing, which is what differs between Phosphor's weights. */
const glyph = (Glyph: Icon, weight: "fill" | "regular") =>
  renderToStaticMarkup(<Glyph weight={weight} />).match(/<svg[^>]*>(.*)<\/svg>/)![1];

describe("the settings menu's icons", () => {
  it.each([
    ["the sidebar, open", () => drawSidebar(false)],
    ["the sidebar, closed", () => drawSidebar(true)],
    ["the phone's tabs", drawPhoneTabs],
  ])("are hollow, never filled, in %s", (_where, draw) => {
    const html = draw();
    for (const { icon } of ALL_SECTIONS) {
      expect(html).toContain(glyph(icon, "regular"));
      expect(html).not.toContain(glyph(icon, "fill"));
    }
  });

  it("hides them from screen readers, which read the row's name", () => {
    const svgs = drawPhoneTabs().match(/<svg[^>]*>/g)!;
    expect(svgs).toHaveLength(ALL_SECTIONS.length);
    expect(svgs.every((svg) => svg.includes('aria-hidden="true"'))).toBe(true);
  });
});
