import { describe, expect, it } from "vitest";

import {
  APP_CONFIG,
  APPS_SCREEN_SWITCHABLE_IDS,
  MAIN_NAV_APP_IDS,
  OPT_IN_APP_IDS,
} from "@/config/apps";
import { ALL_PERMISSION_KEYS, APP_PAGE_PERMISSION } from "@/config/permissions";
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
    // Shown to whoever writes them: a role sees a page only when it can change it.
    expect(APP_PAGE_PERMISSION.coupons).toBe("coupons.manage");
    expect(ALL_PERMISSION_KEYS.filter((key) => key.startsWith("coupons."))).toEqual([
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
    expect(bn.nav.coupons).toBeTruthy();
    expect(bn.settings.apps.items.coupons?.label).toBeTruthy();
  });
});
