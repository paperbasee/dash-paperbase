/**
 * Totals preview on the New order page and the order editor. Without a delivery zone the
 * API cannot price an order (Sentry API-PAPERBASE-65 was this request answering 500), so the
 * editors must not ask, and must show a hint instead of stale or zero totals.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";
import {
  hasDeliveryZone,
  pricingPreviewDisplay,
  shouldRequestPricingPreview,
} from "@/lib/orders/order-pricing-preview";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const NEW_ORDER_HOOK = read("src/app/[locale]/(dashboard)/orders/new/useNewOrder.ts");
const NEW_ORDER_PAGE = read("src/app/[locale]/(dashboard)/orders/new/page.tsx");
const EDIT_PAGE = read("src/app/[locale]/(dashboard)/orders/[public_id]/page.tsx");

const BLANK_ZONES = ["", "   ", null, undefined];

describe("hasDeliveryZone", () => {
  it("treats blank, whitespace and missing ids as no zone", () => {
    for (const zone of BLANK_ZONES) expect(hasDeliveryZone(zone), String(zone)).toBe(false);
    expect(hasDeliveryZone("szn_abc")).toBe(true);
  });
});

describe("shouldRequestPricingPreview", () => {
  it("does not ask the API without a delivery zone", () => {
    for (const zone of BLANK_ZONES) {
      expect(shouldRequestPricingPreview({ lineCount: 3, zonePublicId: zone }), String(zone)).toBe(false);
    }
  });

  it("does not ask the API without lines", () => {
    expect(shouldRequestPricingPreview({ lineCount: 0, zonePublicId: "szn_abc" })).toBe(false);
  });

  it("asks once there is a line and a zone", () => {
    expect(shouldRequestPricingPreview({ lineCount: 1, zonePublicId: "szn_abc" })).toBe(true);
  });
});

describe("pricingPreviewDisplay", () => {
  const base = { lineCount: 2, zonePublicId: "szn_abc", hasPreview: false, failed: false };

  it("asks for a zone, even while totals from an earlier zone are still held", () => {
    for (const zone of BLANK_ZONES) {
      expect(pricingPreviewDisplay({ ...base, zonePublicId: zone, hasPreview: true })).toBe("chooseZone");
      expect(pricingPreviewDisplay({ ...base, zonePublicId: zone, failed: true })).toBe("chooseZone");
    }
  });

  it("shows totals for a chosen zone", () => {
    expect(pricingPreviewDisplay({ ...base, hasPreview: true })).toBe("totals");
  });

  it("shows calculating while the answer is pending", () => {
    expect(pricingPreviewDisplay(base)).toBe("calculating");
  });

  it("says totals are unavailable after a failed request", () => {
    expect(pricingPreviewDisplay({ ...base, failed: true })).toBe("unavailable");
  });

  it("shows nothing without lines", () => {
    expect(pricingPreviewDisplay({ ...base, lineCount: 0, zonePublicId: "" })).toBe("empty");
  });
});

describe("totals preview wiring", () => {
  const enPages = (en as Record<string, any>).pages as Record<string, string>;
  const bnPages = (bn as Record<string, any>).pages as Record<string, string>;

  it("has the hint copy in English and Bengali", () => {
    for (const key of ["orderNewSelectZoneForPreview", "toastDescTotalsPreviewPaused", "orderDetailCalculating"]) {
      expect(enPages[key]?.trim(), `en ${key}`).toBeTruthy();
      expect(bnPages[key]?.trim(), `bn ${key}`).toBeTruthy();
      expect(bnPages[key], `bn ${key} is untranslated`).not.toBe(enPages[key]);
    }
  });

  it("gates both preview requests on the helper", () => {
    for (const [name, src] of [["useNewOrder", NEW_ORDER_HOOK], ["order editor", EDIT_PAGE]] as const) {
      expect(src, name).toContain("admin/orders/pricing-preview/");
      expect(src, name).toContain("shouldRequestPricingPreview(");
      expect(src, name).toContain("pricingPreviewDisplay(");
    }
  });

  it("shows the zone hint on both pages", () => {
    expect(NEW_ORDER_PAGE).toContain('pricingDisplay === "chooseZone"');
    expect(NEW_ORDER_PAGE).toContain('tPages("orderNewSelectZoneForPreview")');
    expect(EDIT_PAGE).toContain('pricingDisplay === "chooseZone"');
    expect(EDIT_PAGE).toContain('tPages("orderNewSelectZoneForPreview")');
  });
});
