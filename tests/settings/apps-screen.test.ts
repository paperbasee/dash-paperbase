import { describe, expect, it } from "vitest";

import {
  APP_CONFIG,
  APPS_SCREEN_ALWAYS_ON_IDS,
  APPS_SCREEN_SWITCHABLE_IDS,
} from "@/config/apps";

/**
 * Settings -> Apps lists the apps in a merchant's shop. An app earns its place
 * there by having a place of its own in the sidebar.
 *
 * `shipping`, `popup` and `cta` have no `href` because they ARE settings
 * screens -- Settings -> Shipping, and the two Promotions tabs. Listing them
 * asked a merchant to switch on the page they were already standing in.
 */
describe("Settings → Apps", () => {
  it("lists a shop-facing feature that has no dashboard page", () => {
    /*
     * The screen used to list only apps with an `href`, which was a proxy for
     * "is not a settings screen" and broke here: order tracking is a page in
     * the SHOP with no dashboard page and nowhere else to switch it, so the
     * href rule silently hid it and no merchant could ever turn the feature
     * on. It was built and unreachable.
     */
    expect(APP_CONFIG.order_lookup.href).toBeNull();
    expect(APPS_SCREEN_SWITCHABLE_IDS).toContain("order_lookup");
  });

  it("does not list the three settings screens", () => {
    const listed = [...APPS_SCREEN_ALWAYS_ON_IDS, ...APPS_SCREEN_SWITCHABLE_IDS];
    for (const id of ["shipping", "popup", "cta"]) {
      expect(listed).not.toContain(id);
    }
  });

  it("shows an app that cannot be switched off, rather than hiding it", () => {
    // A merchant who cannot find Accounts on this screen concludes their shop
    // does not have them.
    for (const id of ["customers", "accounts", "abandoned_checkouts"]) {
      expect(APPS_SCREEN_ALWAYS_ON_IDS).toContain(id);
      expect(APPS_SCREEN_SWITCHABLE_IDS).not.toContain(id);
    }
  });

  it("still lists every app that does have one", () => {
    expect(APPS_SCREEN_ALWAYS_ON_IDS).toEqual([
      "products",
      "orders",
      "inventory",
      "abandoned_checkouts",
      "customers",
      "accounts",
    ]);
    expect(APPS_SCREEN_SWITCHABLE_IDS).toEqual([
      "analytics",
      "support_tickets",
      "blog",
      "wishlist",
      "coupons",
      "order_lookup",
    ]);
  });
});
