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
import { OPTIONAL_APP_IDS } from "@/config/apps";
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
  it("are optional apps, so each follows the store's enabled flag", () => {
    for (const tab of PROMOTION_TABS) {
      expect(OPTIONAL_APP_IDS as readonly string[]).toContain(tab);
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

  it("lets a banners-only staff member reach Banners without any settings permission", () => {
    const access = staff(["banners.view"]);
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
    expect(resolvePromotionTab(null, all)).toBe("banners");
    expect(resolvePromotionTab("", all)).toBe("banners");
    expect(resolvePromotionTab("coupons", all)).toBe("banners");
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
