/**
 * A save asks again for everything the dashboard keeps of a product -- its own copy included,
 * which nothing refreshed before (owner, 2026-10-04: a new photo took minutes to show).
 */
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { refreshProductCaches } from "@/lib/products/refresh-caches";
import { navCountsQueryKey, productDetailQueryKey, productsListQueryKey } from "@/lib/query-keys";

const seeded = () => {
  const client = new QueryClient();
  client.setQueryData(productDetailQueryKey("p1"), { public_id: "p1" });
  client.setQueryData(productDetailQueryKey("p2"), { public_id: "p2" });
  client.setQueryData(productsListQueryKey({ page: "1" }), { results: [] });
  client.setQueryData(navCountsQueryKey, {});
  return client;
};
const stale = (client: QueryClient, key: readonly unknown[]) => client.getQueryState(key)?.isInvalidated;

describe("refreshing a product's copies", () => {
  it("marks the product itself, the lists and the counts out of date", async () => {
    const client = seeded();
    await refreshProductCaches(client, "p1");
    expect(stale(client, productDetailQueryKey("p1"))).toBe(true);
    expect(stale(client, productsListQueryKey({ page: "1" }))).toBe(true);
    expect(stale(client, navCountsQueryKey)).toBe(true);
    // Another product's copy is still good.
    expect(stale(client, productDetailQueryKey("p2"))).toBe(false);
  });

  it("without an id (a new product) refreshes the lists only", async () => {
    const client = seeded();
    await refreshProductCaches(client);
    expect(stale(client, productsListQueryKey({ page: "1" }))).toBe(true);
    expect(stale(client, productDetailQueryKey("p1"))).toBe(false);
  });
});
