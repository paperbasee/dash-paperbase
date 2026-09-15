import { describe, expect, it } from "vitest";

import { SHIPPING_SETTINGS_HREF } from "@/app/[locale]/(dashboard)/settings/sections/shipping/shippingHref";
import {
  ALL_SECTIONS,
  SECTIONS,
  isSectionVisible,
  resolveSettingsSection,
} from "@/app/[locale]/(dashboard)/settings/settingsSections";
import { APP_CONFIG, ESSENTIAL_APP_IDS, MAIN_NAV_APP_IDS } from "@/config/apps";
import { APP_VIEW_PERMISSION } from "@/config/permissions";

/**
 * Shipping used to be a sidebar link. It now lives in Settings → Shipping, and must
 * stay exactly as reachable as it was: the sidebar showed it to any role that can
 * view the shipping app, whether or not that role can see any other settings.
 */

/** Access for a staff role with every app enabled, holding only the listed permission keys. */
function staff(granted: string[]) {
  const has = (key: string) => granted.includes(key);
  const canShowApp = (appId: string) => has(APP_VIEW_PERMISSION[appId]);
  return { has, isOwner: false, isSuperuser: false, canShowApp };
}

describe("shipping app", () => {
  it("is essential, so the store can never switch it off", () => {
    expect(ESSENTIAL_APP_IDS as readonly string[]).toContain("shipping");
  });

  it("has left the sidebar", () => {
    expect(MAIN_NAV_APP_IDS as readonly string[]).not.toContain("shipping");
    expect(APP_CONFIG.shipping.href).toBeNull();
  });
});

describe("Shipping section", () => {
  it("sits right after Checkout", () => {
    const ids = ALL_SECTIONS.map((row) => row.id);
    expect(ids.indexOf("shipping")).toBe(ids.indexOf("checkout") + 1);
  });

  it("is hidden when the shipping app cannot be shown, even for the owner", () => {
    const owner = { has: () => true, isOwner: true, isSuperuser: false };
    expect(isSectionVisible("shipping", { ...owner, canShowApp: () => false })).toBe(false);
    expect(
      isSectionVisible("shipping", { ...owner, canShowApp: (appId) => appId === "shipping" }),
    ).toBe(true);
  });

  it("is hidden from a role without shipping.view, even with settings.view", () => {
    expect(isSectionVisible("shipping", staff(["settings.view"]))).toBe(false);
  });

  it("lets a shipping-only staff member reach Shipping without any settings permission", () => {
    const access = staff(["shipping.view"]);
    const visible = SECTIONS.filter((row) => isSectionVisible(row.id, access));
    expect(visible.map((row) => row.id)).toEqual(["shipping", "account"]);
    // Plain /settings and the default "store" tab both land them on Shipping.
    expect(resolveSettingsSection(null, visible)).toBe("shipping");
    expect(resolveSettingsSection("store", visible)).toBe("shipping");
  });

  it("builds the legacy /shipping redirect so it lands on the Shipping section", () => {
    const [pathname, query] = SHIPPING_SETTINGS_HREF.split("?");
    const params = new URLSearchParams(query);
    expect(pathname).toBe("/settings");
    expect(resolveSettingsSection(params.get("tab"), SECTIONS)).toBe("shipping");
  });
});
