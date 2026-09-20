import { describe, expect, it } from "vitest";

import {
  PROMOTION_TABS,
  PROMOTION_TAB_PARAM,
  promotionsHref,
  resolvePromotionTab,
} from "@/app/[locale]/(dashboard)/settings/sections/promotions/promotionTabs";
import {
  SECTIONS,
  isSectionVisible,
  resolveSettingsSection,
} from "@/app/[locale]/(dashboard)/settings/settingsSections";
import { ALWAYS_ON_EXTRA_APP_IDS, APPS_SCREEN_SWITCHABLE_IDS } from "@/config/apps";
import { APP_VIEW_PERMISSION } from "@/config/permissions";

/**
 * Banners, Pop-up and CTA used to be sidebar links. They now live as tabs in
 * Settings → Promotions, and must stay exactly as reachable as they were.
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
      isSectionVisible("promotions", { ...owner, canShowApp: (appId) => appId === "cta" }),
    ).toBe(true);
  });

  it("is hidden from a role that holds none of the three view keys", () => {
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

describe("active promotion tab from the URL", () => {
  const all = [...PROMOTION_TABS];

  it("uses the tab named in the URL when the user can open it", () => {
    expect(resolvePromotionTab("cta", all)).toBe("cta");
    expect(resolvePromotionTab(" popup ", all)).toBe("popup");
  });

  it("falls back to the first visible tab when the param is missing or unknown", () => {
    expect(resolvePromotionTab(null, all)).toBe("popup");
    expect(resolvePromotionTab("", all)).toBe("popup");
    expect(resolvePromotionTab("coupons", all)).toBe("popup");
  });

  it("falls back to the first visible tab when the URL names a tab the user cannot open", () => {
    expect(resolvePromotionTab("banners", ["popup", "cta"])).toBe("popup");
  });

  it("resolves to nothing when no tab is visible", () => {
    expect(resolvePromotionTab("banners", [])).toBeNull();
  });

  it("builds the legacy-route redirect so each link lands on its own tab", () => {
    for (const tab of PROMOTION_TABS) {
      const href = promotionsHref(tab);
      const [pathname, query] = href.split("?");
      const params = new URLSearchParams(query);
      expect(pathname).toBe("/settings");
      expect(params.get("tab")).toBe("promotions");
      expect(resolvePromotionTab(params.get(PROMOTION_TAB_PARAM), all)).toBe(tab);
    }
  });
});
