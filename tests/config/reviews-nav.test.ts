/**
 * Where the Reviews tab sits, and why it has no switch.
 *
 * The nav config is data, and data that is wrong here fails quietly: an app
 * missing from `CATALOG_SUB_APP_IDS` simply never appears in the sidebar, and
 * one missing from `APP_PAGE_PERMISSION` is visible to a member who may not
 * open it. Neither throws, so neither is noticed.
 */

import { describe, expect, test } from "vitest";

import {
  APP_CONFIG,
  CATALOG_INCLUDED_APP_IDS,
  CATALOG_SUB_APP_IDS,
  OPT_IN_APP_IDS,
} from "@/config/apps";
import { ALL_PERMISSION_KEYS, APP_PAGE_PERMISSION } from "@/config/permissions";

describe("the Reviews tab", () => {
  test("exists, and points at its own page", () => {
    expect(APP_CONFIG.reviews?.href).toBe("/reviews");
  });

  test("shows how many reviews are WAITING", () => {
    /*
     * A review arrives pending and nothing on a product page changes until a
     * merchant approves it -- so without a badge the queue is invisible until
     * somebody goes looking, and the shopper who wrote one watches it never
     * appear.
     *
     * `countKey` was null until 2026-09-22 even though the number already
     * existed; that is the sort of thing that fails quietly, because a missing
     * badge looks exactly like an empty queue.
     */
    expect(APP_CONFIG.reviews?.countKey).toBe("reviews");
  });

  test("sits in the Catalog group, where the products it is about live", () => {
    expect(CATALOG_SUB_APP_IDS).toContain("reviews");
    expect(APP_CONFIG.reviews?.parentId).toBe("catalog");
  });

  test("is gated on its own permission, not the catalogue's", () => {
    // A merchant may want somebody answering reviews who has no business
    // editing prices -- and, far more so, the other way round.
    expect(APP_PAGE_PERMISSION.reviews).toBe("reviews.manage");
    expect(APP_PAGE_PERMISSION.reviews).not.toBe(APP_PAGE_PERMISSION.products);
  });

  test("has no switch, and is not offered as one", () => {
    /*
     * A shopper can write a review whether or not the merchant has ever opened
     * this tab. A switch would hide the queue those reviews wait in, leaving
     * them unanswered and invisible rather than absent -- the popup/cta mistake
     * with worse consequences. What IS optional is showing reviews in the shop,
     * and that lives on the storefront sections, which are premium.
     */
    expect(CATALOG_INCLUDED_APP_IDS).toContain("reviews");
    expect(OPT_IN_APP_IDS as readonly string[]).not.toContain("reviews");
  });

  test("has both permission keys, as the API declares them", () => {
    expect(ALL_PERMISSION_KEYS.filter((key) => key.startsWith("reviews."))).toEqual([
      "reviews.view",
      "reviews.manage",
    ]);
  });
});
