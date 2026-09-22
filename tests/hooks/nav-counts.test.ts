/**
 * What the sidebar badges count.
 *
 * Plain data translation, and translation that is wrong here fails quietly: a
 * badge reading the wrong field shows a plausible number, and one reading a
 * missing field shows NaN. Neither throws, so neither is noticed.
 */

import { describe, expect, test } from "vitest";

import { mapStatsToNavCounts } from "@/hooks/useNavCounts";
import type { DashboardStats } from "@/types";

function stats(over: Partial<DashboardStats> = {}): DashboardStats {
  return {
    orders: { total: 12, pending: 3, confirmed: 8, cancelled: 1 },
    revenue: "100.00",
    products: { total: 40, active: 30, out_of_stock: 2 },
    category_roots: 3,
    category_total: 9,
    support_tickets: 4,
    customers_count: 19,
    blogs_count: 5,
    recent_orders: [],
    ...over,
  };
}

describe("the reviews badge", () => {
  test("counts reviews that are WAITING", () => {
    /*
     * A review arrives pending and nothing on a product page changes until a
     * merchant approves it. Without a badge the queue is invisible until
     * somebody goes looking, and the shopper who wrote one watches it never
     * appear.
     */
    expect(mapStatsToNavCounts(stats({ reviews_pending: 7 })).reviews).toBe(7);
  });

  test("shows nothing when nothing is waiting", () => {
    /* It means "there is work here", not "this shop has reviews". */
    expect(mapStatsToNavCounts(stats({ reviews_pending: 0 })).reviews).toBe(0);
  });

  test("an API without the field reads as nothing waiting, never NaN", () => {
    /*
     * The safe way round, and what a dashboard sees against an API deployed
     * before the field existed.
     */
    const counts = mapStatsToNavCounts(stats());
    expect(counts.reviews).toBe(0);
    expect(Number.isNaN(counts.reviews)).toBe(false);
  });
});

describe("the badges that were already there", () => {
  test("still read their own fields", () => {
    /* Adding one must not quietly move another. */
    const counts = mapStatsToNavCounts(stats({ reviews_pending: 7 }));
    expect(counts.orders).toBe(12);
    expect(counts.products).toBe(30);
    expect(counts.customers).toBe(19);
    expect(counts.supportTickets).toBe(4);
    expect(counts.blog).toBe(5);
  });
});
