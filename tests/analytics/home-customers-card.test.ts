/**
 * The home dashboard's Customers card (owner, 2026-09-29): the different people who bought in the
 * period -- orders not cancelled, the same orders the Orders card counts -- so it can never read
 * more than Orders. It counted new customer records, and said "New in selected period".
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("the Customers card", () => {
  test("says it counts the people who bought, not new records", () => {
    expect(en.dashboard.customersInPeriod).toBe("Bought in this period");
    expect(bn.dashboard.customersInPeriod).toBe("এই সময়ে কিনেছেন");
    expect(en.dashboard.customersInPeriod).not.toMatch(/new/i);
  });

  test("reads the API's count, which the API takes from the counted orders", () => {
    const page = fs.readFileSync(path.join(ROOT, "src/app/[locale]/(dashboard)/page.tsx"), "utf8");
    expect(page).toContain('subtitle={t("customersInPeriod")}');
    const api = path.resolve(ROOT, "../api-paperbase/engine/apps/basic_analytics/views.py");
    if (fs.existsSync(api)) {
      expect(fs.readFileSync(api, "utf8")).toContain('"totalCustomers": _buyers(order_qs),');
    }
  });
});
