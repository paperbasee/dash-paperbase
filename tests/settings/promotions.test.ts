import { describe, expect, it } from "vitest";

import {
  PROMOTION_TABS,
  promotionsHref,
} from "@/app/[locale]/(dashboard)/settings/sections/promotions/promotionTabs";
import {
  SECTIONS,
  isSectionVisible,
  resolveSettingsSection,
} from "@/app/[locale]/(dashboard)/settings/settingsSections";
import { ALWAYS_ON_EXTRA_APP_IDS, APP_CONFIG, APPS_SCREEN_SWITCHABLE_IDS } from "@/config/apps";
import { APP_VIEW_PERMISSION } from "@/config/permissions";

/**
 * Banners, Pop-up and CTA used to be sidebar links, then tabs in Settings →
 * Promotions, and they must stay exactly as reachable as they were.
 *
 * Only the pop-up is left. Banners moved into the theme editor on 2026-09-18,
 * and the CTA followed on 2026-09-22 -- it and the editor's announcement bar
 * were two bars doing one job. So there is no tab bar any more, and the tests
 * that drove one went with it.
 */

/** Access for a staff role with every app enabled, holding only the listed permission keys. */
function staff(granted: string[]) {
  const has = (key: string) => granted.includes(key);
  const canShowApp = (appId: string) => has(APP_VIEW_PERMISSION[appId]);
  return { has, isOwner: false, isSuperuser: false, canShowApp };
}

describe("promotion tabs", () => {
  // They had a switch on Settings -> Apps until 2026-09-21. It only ever hid
  // the editor -- the storefront reads neither flag -- so switching one off
  // took away the only screen where the pop-up could be turned off, and a
  // merchant who used it could not find their pop-up again.
  it("are always on, so the editor cannot hide itself", () => {
    for (const tab of PROMOTION_TABS) {
      expect(ALWAYS_ON_EXTRA_APP_IDS as readonly string[]).toContain(tab);
      expect(APPS_SCREEN_SWITCHABLE_IDS).not.toContain(tab);
    }
  });
});

describe("Promotions section visibility", () => {
  it("is hidden when no tab is visible, even for the owner", () => {
    const owner = { has: () => true, isOwner: true, isSuperuser: false };
    expect(isSectionVisible("promotions", { ...owner, canShowApp: () => false })).toBe(false);
    expect(
      isSectionVisible("promotions", { ...owner, canShowApp: (appId) => appId === "popup" }),
    ).toBe(true);
  });

  it("is hidden from a role that cannot view the pop-up", () => {
    expect(isSectionVisible("promotions", staff(["settings.view"]))).toBe(false);
  });

  it("lets a pop-up-only staff member reach the pop-up without any settings permission", () => {
    const access = staff(["popups.view"]);
    const visible = SECTIONS.filter((row) => isSectionVisible(row.id, access));
    expect(visible.map((row) => row.id)).toEqual(["promotions", "account"]);
    // Plain /settings and the default "store" tab both land them on Promotions.
    expect(resolveSettingsSection(null, visible)).toBe("promotions");
    expect(resolveSettingsSection("store", visible)).toBe("promotions");
  });
});

describe("the legacy /popup route", () => {
  it("lands on Promotions, which is the pop-up and nothing else", () => {
    const [pathname, query] = promotionsHref().split("?");
    const params = new URLSearchParams(query);
    expect(pathname).toBe("/settings");
    expect(params.get("tab")).toBe("promotions");
    // No `?promotion=` any more: one panel, so nothing to select.
    expect(params.get("promotion")).toBeNull();
  });

  it("has one promotions app left", () => {
    expect([...PROMOTION_TABS]).toEqual(["popup"]);
  });
});

describe("the CTA is gone", () => {
  /*
   * It and the theme editor's announcement bar were two bars doing one job,
   * edited in two places. The bar won, and every shop's CTA was carried into
   * its announcement bar by `theming/0014` so nothing a shopper saw changed.
   *
   * Asserted rather than assumed, because a nav entry or a permission left
   * behind fails QUIETLY: an app with no page is a sidebar link to nothing,
   * and a permission nothing checks is a role setting that decides nothing.
   */
  it("is not an app any more", () => {
    expect(Object.keys(APP_CONFIG)).not.toContain("cta");
    expect(ALWAYS_ON_EXTRA_APP_IDS as readonly string[]).not.toContain("cta");
  });

  it("has no view permission of its own", () => {
    expect(APP_VIEW_PERMISSION).not.toHaveProperty("cta");
  });

  it("leaves no promotions tab pointing at it", () => {
    expect([...PROMOTION_TABS]).not.toContain("cta");
  });
});
