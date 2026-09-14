import { describe, expect, it, vi } from "vitest";
import { QueriesObserver, QueryClient } from "@tanstack/react-query";
import {
  ensureOrderEditorVariants,
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
});
