import { describe, expect, it } from "vitest";

import {
  APP_CONFIG,
  APPS_SCREEN_SWITCHABLE_IDS,
  MAIN_NAV_APP_IDS,
  OPT_IN_APP_IDS,
} from "@/config/apps";
import { APP_VIEW_PERMISSION, PERMISSION_GROUPS } from "@/config/permissions";
import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

/**
 * Discount codes cost a merchant real taka every time one is used, so who may
 * write one is its own decision rather than something riding on another
 * section's key.
 */
describe("discount codes", () => {
  it("are off until a merchant switches them on", () => {
    // Missing means OFF for these. The storefront reads the flag the same way,
    // and a sidebar entry for something the shop does not serve is a 404.
    expect(OPT_IN_APP_IDS as readonly string[]).toContain("coupons");
    expect(APPS_SCREEN_SWITCHABLE_IDS).toContain("coupons");
  });

  it("have a page of their own in the sidebar", () => {
    expect(APP_CONFIG.coupons.href).toBe("/coupons");
    expect(MAIN_NAV_APP_IDS as readonly string[]).toContain("coupons");
  });

  it("are gated on their own permission, not on promotions", () => {
    expect(APP_VIEW_PERMISSION.coupons).toBe("coupons.view");
    const group = PERMISSION_GROUPS.find((g) => g.id === "coupons");
    expect(group?.permissions.map((p) => p.key)).toEqual([
      "coupons.view",
      "coupons.manage",
    ]);
  });

  it("say everything in both languages", () => {
    const enPages = en.pages as Record<string, string>;
    const bnPages = bn.pages as Record<string, string>;
    const keys = Object.keys(enPages).filter((k) => k.startsWith("coupon"));
    expect(keys.length).toBeGreaterThan(10);
    for (const key of keys) {
      expect(bnPages[key], `pages.${key} has no Bangla`).toBeTruthy();
    }
    for (const key of ["groupCoupons", "permCouponsView", "permCouponsManage"]) {
      expect((bn.settings.team as Record<string, string>)[key], key).toBeTruthy();
    }
    expect(bn.nav.coupons).toBeTruthy();
    expect(bn.settings.apps.items.coupons?.label).toBeTruthy();
  });
});
