/**
 * The free trial a new shop came with, as setup's end shows it (owner's pick, 2026-11-26: a gift card
 * saying the shop "got a 7 days premium"): its days and its end, read from auth/me, never a fixed 7.
 */
import { describe, expect, test } from "vitest";

import type { MeSubscription } from "@/lib/subscription-access";
import { runningTrial } from "@/lib/trial";

const NOW = Date.parse("2026-11-26T14:03:00Z");

function subscription(fields: Partial<MeSubscription> = {}): MeSubscription {
  return {
    subscription_status: "ACTIVE",
    plan: "Premium",
    plan_public_id: "pln_premium",
    starts_at: "2026-11-26T14:03:00+00:00",
    ends_at: "2026-12-03T14:03:00+00:00",
    is_trial: true,
    ...fields,
  };
}

describe("the free trial setup's shop came with", () => {
  test("its days are the period's own, and its end is the API's", () => {
    expect(runningTrial(subscription(), NOW)).toEqual({ days: 7, endsAt: "2026-12-03T14:03:00+00:00" });
    expect(runningTrial(subscription({ ends_at: "2026-12-10T14:03:00+00:00" }), NOW)?.days).toBe(14);
  });

  test("none for a plan that is not a trial, a lapsed one, or no plan at all", () => {
    expect(runningTrial(subscription({ is_trial: false }), NOW)).toBeNull();
    expect(runningTrial(subscription({ subscription_status: "EXPIRED" }), NOW)).toBeNull();
    expect(runningTrial(subscription({ ends_at: "2026-11-26T14:02:00+00:00" }), NOW)).toBeNull();
    expect(
      runningTrial(subscription({ subscription_status: "NONE", is_trial: false, starts_at: null, ends_at: null }), NOW)
    ).toBeNull();
  });
});
