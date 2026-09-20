import { describe, expect, it } from "vitest";

import { isNavHrefActive } from "@/lib/navigation/nav-active";
import { APP_CONFIG, NAV_CHILD_APP_IDS, CATALOG_SUB_APP_IDS } from "@/config/apps";

const href = (id: string) => APP_CONFIG[id].href as string;

/**
 * One row lights up at a time. Some apps sit under another app's route, and a
 * plain prefix test lit up both -- standing on Abandoned checkouts with Orders
 * highlighted beside it says the merchant is in two places.
 */
describe("which sidebar row is active", () => {
  it("lights the child alone, not the parent it sits under", () => {
    const pairs: [string, string][] = [
      ["abandoned_checkouts", "orders"],
      ["accounts", "customers"],
      ["wishlist", "products"],
    ];
    for (const [child, parent] of pairs) {
      const pathname = href(child);
      expect(isNavHrefActive(pathname, href(child))).toBe(true);
      expect(isNavHrefActive(pathname, href(parent))).toBe(false);
    }
  });

  it("still lights the list from a detail page under it", () => {
    expect(isNavHrefActive("/orders/ORD-1234", "/orders")).toBe(true);
    expect(isNavHrefActive("/orders/ORD-1234", "/orders/abandoned")).toBe(false);
    expect(isNavHrefActive("/products/abc-123", "/products")).toBe(true);
  });

  it("matches whole segments, never a route that merely starts the same", () => {
    expect(isNavHrefActive("/orders-archive", "/orders")).toBe(false);
    expect(isNavHrefActive("/orders", "/orders")).toBe(true);
  });

  it("gives home to home alone", () => {
    expect(isNavHrefActive("/", "/")).toBe(true);
    expect(isNavHrefActive("/orders", "/")).toBe(false);
  });

  it("leaves exactly one row lit on every nav route", () => {
    const rows = Object.values(APP_CONFIG)
      .map((app) => app.href)
      .filter((h): h is string => Boolean(h));
    for (const pathname of rows) {
      const lit = rows.filter((row) => isNavHrefActive(pathname, row));
      expect(lit, `on ${pathname}`).toEqual([pathname]);
    }
  });

  it("lights one row inside every group that has a tree", () => {
    const groups = [
      ...Object.values(NAV_CHILD_APP_IDS),
      CATALOG_SUB_APP_IDS as readonly string[],
    ];
    for (const ids of groups) {
      for (const id of ids) {
        const lit = ids.filter((sibling) => isNavHrefActive(href(id), href(sibling)));
        expect(lit, `on ${href(id)}`).toEqual([id]);
      }
    }
  });
});
