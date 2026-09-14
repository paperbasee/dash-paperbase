import { describe, expect, it, vi } from "vitest";
import { onlineManager, QueriesObserver, QueryClient } from "@tanstack/react-query";
import {
  ensureOrderEditorVariants,
  invalidateOrderEditorVariants,
  orderEditorVariantsQueryKey,
  orderEditorVariantsQueryOptions,
  type OrderEditorVariantsHttp,
} from "@/lib/orders/order-editor-variants";
import { variantsQueryKeyRoot } from "@/lib/query-keys";
import type { ProductVariant } from "@/types";

type Pending = { resolve: (value: { data: ProductVariant[] }) => void; reject: (err: unknown) => void };

/** Fake http whose GETs stay pending until the test resolves them, one product at a time. */
function createDeferredHttp() {
  const pending = new Map<string, Pending[]>();
  const get = vi.fn((_url: string, config?: { params?: Record<string, unknown> }) => {
    const id = String(config?.params?.product_public_id);
    return new Promise<{ data: ProductVariant[] }>((resolve, reject) => {
      pending.set(id, [...(pending.get(id) ?? []), { resolve, reject }]);
    });
  });
  const variant = (id: string) => ({ public_id: `v-${id}`, product_public_id: id }) as ProductVariant;
  return {
    http: { get } as unknown as OrderEditorVariantsHttp,
    get,
    /** Resolve the oldest in-flight request for this product. */
    resolveOne(id: string) {
      const queue = pending.get(id) ?? [];
      queue.shift()?.resolve({ data: [variant(id)] });
    },
    resolveAll() {
      for (const [id, queue] of pending) {
        while (queue.length) queue.shift()?.resolve({ data: [variant(id)] });
      }
    },
    rejectOne(id: string) {
      (pending.get(id) ?? []).shift()?.reject(new Error("boom"));
    },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

/**
 * Mirrors one Edit click on the order page: the page asks for the variants of every product on the
 * order on mount, and asks again after every state change (each response is a state change).
 */
async function editSessionRequestCount(n: number) {
  const client = newClient();
  const fake = createDeferredHttp();
  const ids = Array.from({ length: n }, (_, i) => `p${i}`);
  const sweep = () => ids.forEach((id) => void ensureOrderEditorVariants(client, id, fake.http));

  sweep();
  for (const id of ids) {
    fake.resolveOne(id);
    await flush();
    sweep();
  }
  fake.resolveAll();
  await flush();
  return { client, fake, ids, sweep, calls: fake.get.mock.calls.length };
}

describe("order editor variants loading", () => {
  it("requests each product's variants once per Edit click, whatever the order size", async () => {
    const small = await editSessionRequestCount(3);
    const large = await editSessionRequestCount(12);
    // One request per distinct product: flat per product, not growing with N.
    expect(small.calls / 3).toBe(1);
    expect(large.calls / 12).toBe(small.calls / 3);
  });

  it("issues no more requests while the variants are already loaded", async () => {
    const session = await editSessionRequestCount(5);
    const before = session.fake.get.mock.calls.length;
    session.sweep();
    await flush();
    expect(session.fake.get.mock.calls.length).toBe(before);
  });

  it("requests active variants only (no include_inactive)", async () => {
    const client = newClient();
    const fake = createDeferredHttp();
    void ensureOrderEditorVariants(client, "p1", fake.http);
    expect(fake.get).toHaveBeenCalledTimes(1);
    expect(fake.get.mock.calls[0][0]).toBe("admin/product-variants/");
    expect(fake.get.mock.calls[0][1]).toEqual({ params: { product_public_id: "p1" } });
    fake.resolveAll();
    await flush();
  });

  it("does not retry a failed product on later sweeps (same as before: empty list, one attempt)", async () => {
    const client = newClient();
    const fake = createDeferredHttp();
    void ensureOrderEditorVariants(client, "p1", fake.http);
    fake.rejectOne("p1");
    await flush();
    void ensureOrderEditorVariants(client, "p1", fake.http);
    await flush();
    expect(fake.get).toHaveBeenCalledTimes(1);
  });

  it("stays under the variants root so Variants page saves invalidate it", () => {
    expect(orderEditorVariantsQueryKey("p1").slice(0, variantsQueryKeyRoot.length)).toEqual([
      ...variantsQueryKeyRoot,
    ]);
  });

  /**
   * The page's useOrderEditorVariants hook is useQueries, i.e. a QueriesObserver whose queries are
   * set again on every render. Re-render after every response and count requests.
   */
  async function observerSessionRequestCount(n: number, client = newClient(), fake = createDeferredHttp()) {
    const ids = Array.from({ length: n }, (_, i) => `p${i}`);
    type ObserverQueries = ConstructorParameters<typeof QueriesObserver>[1];
    const queries = () =>
      ids.map((id) => orderEditorVariantsQueryOptions(id, fake.http)) as unknown as ObserverQueries;
    const observer = new QueriesObserver(client, queries());
    const before = fake.get.mock.calls.length;
    const unsubscribe = observer.subscribe(() => {});
    for (const id of ids) {
      observer.setQueries(queries());
      fake.resolveOne(id);
      await flush();
      observer.setQueries(queries());
    }
    fake.resolveAll();
    await flush();
    const calls = fake.get.mock.calls.length - before;
    return { calls, unsubscribe, client, fake };
  }

  it("useQueries path: one request per product per Edit click, and none on a fresh reopen", async () => {
    const small = await observerSessionRequestCount(3);
    const large = await observerSessionRequestCount(12);
    expect(small.calls / 3).toBe(1);
    expect(large.calls / 12).toBe(small.calls / 3);

    // Close the editor, open it again while the entries are fresh: no requests at all.
    large.unsubscribe();
    const reopened = await observerSessionRequestCount(12, large.client, large.fake);
    expect(reopened.calls).toBe(0);
    reopened.unsubscribe();
    small.unsubscribe();
  });

  /** Loaded, fresh entries for N products (the editor was opened and closed within 2 minutes). */
  async function freshEntries(n: number) {
    const client = newClient();
    const fake = createDeferredHttp();
    const ids = Array.from({ length: n }, (_, i) => `p${i}`);
    ids.forEach((id) => ensureOrderEditorVariants(client, id, fake.http));
    fake.resolveAll();
    await flush();
    return { client, fake, ids };
  }

  /** Requests an editor mount makes for these products, observing them like useQueries does. */
  async function mountRequests(client: QueryClient, fake: ReturnType<typeof createDeferredHttp>, ids: string[]) {
    type ObserverQueries = ConstructorParameters<typeof QueriesObserver>[1];
    const before = fake.get.mock.calls.length;
    const observer = new QueriesObserver(
      client,
      ids.map((id) => orderEditorVariantsQueryOptions(id, fake.http)) as unknown as ObserverQueries,
    );
    const unsubscribe = observer.subscribe(() => {});
    await flush();
    fake.resolveAll();
    await flush();
    unsubscribe();
    return fake.get.mock.calls.length - before;
  }

  /** What the order pages call after creating, editing, or changing the status of an order. */
  function invalidateAfterOrderChange(client: QueryClient) {
    return invalidateOrderEditorVariants(client);
  }

  it("an order change makes the next editor mount reload stock, once per product at any N", async () => {
    for (const n of [3, 12]) {
      const { client, fake, ids } = await freshEntries(n);
      // Fresh and untouched: reopening costs nothing.
      expect(await mountRequests(client, fake, ids)).toBe(0);
      // The merchant saves/creates/cancels an order: stock may have moved, so reload it.
      await invalidateAfterOrderChange(client);
      expect((await mountRequests(client, fake, ids)) / n).toBe(1);
      // And it is fresh again afterwards.
      expect(await mountRequests(client, fake, ids)).toBe(0);
    }
  });

  it("an order change refetches an open editor's products once each, whatever the order size", async () => {
    const perProduct: number[] = [];
    for (const n of [3, 12]) {
      const { client, fake, ids } = await freshEntries(n);
      type ObserverQueries = ConstructorParameters<typeof QueriesObserver>[1];
      const observer = new QueriesObserver(
        client,
        ids.map((id) => orderEditorVariantsQueryOptions(id, fake.http)) as unknown as ObserverQueries,
      );
      const unsubscribe = observer.subscribe(() => {});
      await flush();
      const before = fake.get.mock.calls.length;
      await Promise.all([invalidateAfterOrderChange(client), (async () => {
        await flush();
        fake.resolveAll();
      })()]);
      await flush();
      perProduct.push((fake.get.mock.calls.length - before) / n);
      unsubscribe();
    }
    expect(perProduct[0]).toBe(1);
    expect(perProduct[1]).toBe(perProduct[0]);
  });

  it("does not touch other variants caches (the Variants page list) on an order change", async () => {
    const client = newClient();
    const otherKey = [...variantsQueryKeyRoot, "list", "p1", ""];
    client.setQueryData(otherKey, []);
    await invalidateAfterOrderChange(client);
    expect(client.getQueryState(otherKey)?.isInvalidated).toBe(false);
  });

  it("offline, still attempts the request and fails (empty list) instead of waiting in 'Loading'", async () => {
    onlineManager.setOnline(false);
    try {
      const client = newClient();
      const fake = createDeferredHttp();
      ensureOrderEditorVariants(client, "p1", fake.http);
      expect(fake.get).toHaveBeenCalledTimes(1);
      fake.rejectOne("p1");
      await flush();
      const state = client.getQueryState(orderEditorVariantsQueryKey("p1"));
      expect(state?.status).toBe("error");
      expect(state?.fetchStatus).toBe("idle");
    } finally {
      onlineManager.setOnline(true);
    }
  });
});
