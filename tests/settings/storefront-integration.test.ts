import { describe, expect, it } from "vitest";

import { storefrontIntegrationAvailable } from "@/app/[locale]/(dashboard)/settings/storefrontIntegration";

/**
 * Under host routing the API omits storefront_url / revalidate_secret from
 * store/settings/current/. The dashboard hides the Storefront integration
 * block and skips PATCHing them unless the keys are actually present.
 */

describe("storefrontIntegrationAvailable", () => {
  it("is false when there is no settings row yet", () => {
    expect(storefrontIntegrationAvailable(undefined)).toBe(false);
    expect(storefrontIntegrationAvailable(null)).toBe(false);
  });

  it("is false for non-objects", () => {
    expect(storefrontIntegrationAvailable("storefront_url")).toBe(false);
    expect(storefrontIntegrationAvailable(42)).toBe(false);
  });

  it("is false when the API omitted both keys (host routing)", () => {
    expect(storefrontIntegrationAvailable({ language: "en" })).toBe(false);
  });

  it("is true when storefront_url is present, even if empty or null", () => {
    expect(storefrontIntegrationAvailable({ storefront_url: "" })).toBe(true);
    expect(storefrontIntegrationAvailable({ storefront_url: null })).toBe(true);
  });

  it("is true when only revalidate_secret is present", () => {
    expect(storefrontIntegrationAvailable({ revalidate_secret: "" })).toBe(true);
  });

  it("ignores keys that exist only on the prototype", () => {
    const row = Object.create({ storefront_url: "https://shop.example", revalidate_secret: "x" });
    expect(storefrontIntegrationAvailable(row)).toBe(false);
  });
});
