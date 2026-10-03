/**
 * Apps a plan must include (owner, 2026-10-04: analytics is Premium only): off on a plan without
 * the feature, back by itself on the upgrade, and nothing taken away before the plan has loaded.
 */
import { describe, expect, it } from "vitest";

import { APP_PLAN_FEATURE, planIncludesApp } from "@/config/apps";

describe("which apps a plan includes", () => {
  it("analytics needs Premium's analytics, whatever the shop switched", () => {
    expect(APP_PLAN_FEATURE.analytics).toBe("advanced_analytics");
    expect(planIncludesApp("analytics", { advanced_analytics: true })).toBe(true);
    expect(planIncludesApp("analytics", { order_email_notifications: false })).toBe(false);
    expect(planIncludesApp("analytics", { basic_analytics: true })).toBe(false);
  });

  it("apps no plan gates are every plan's, and an unloaded plan takes nothing away", () => {
    expect(planIncludesApp("blog", {})).toBe(true);
    expect(planIncludesApp("analytics", null)).toBe(true);
  });
});
