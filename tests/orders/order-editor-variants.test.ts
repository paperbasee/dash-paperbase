import { describe, expect, it, vi } from "vitest";
import { onlineManager, QueriesObserver, QueryClient } from "@tanstack/react-query";
import {
  createOrderEditorVariantsFailureReporter,
  ensureOrderEditorVariants,
  invalidateOrderEditorVariants,
  orderEditorVariantsQueryKey,
  orderEditorVariantsQueryOptions,
  type OrderEditorVariantsHttp,
} from "@/lib/orders/order-editor-variants";
import { variantsListQueryKey, variantsQueryKeyRoot } from "@/lib/query-keys";
import type { PaginatedResponse, ProductVariant } from "@/types";

type Params = Record<string, unknown>;
type Pending = {
  params: Params;
  resolve: (value: { data: PaginatedResponse<ProductVariant> }) => void;
  reject: (err: unknown) => void;
};

/** Ids a variants request asks for, whether one product (`product_public_id`) or several. */
function requestedIds(params: Params): string[] {
  if (typeof params.product_public_ids === "string") {
    return params.product_public_ids.split(",").filter(Boolean);
  }
  return [String(params.product_public_id)];
}

/**
 * Fake admin/product-variants/ whose GETs stay pending until the test answers them. Answers are
 * built like the API: active rows of the requested products ordered by product, paginated
 * (default 24 per page, page_size honoured up to 100).
 */
function createFakeVariantsApi(variantsPerProduct: (id: string) => number = () => 1) {
  const pending: Pending[] = [];
  const get = vi.fn((_url: string, config?: { params?: Params }) => {
    const params = config?.params ?? {};
    return new Promise<{ data: PaginatedResponse<ProductVariant> }>((resolve, reject) => {
      pending.push({ params, resolve, reject });
    });
  });
  const rowsFor = (params: Params) =>
    [...requestedIds(params)].sort().flatMap((id) =>
      Array.from(
        { length: variantsPerProduct(id) },
        (_, i) => ({ public_id: `v-${id}-${i}`, product_public_id: id }) as ProductVariant,
      ),
    );
  const answer = (p: Pending) => {
    const rows = rowsFor(p.params);
    const size = Math.min(Number(p.params.page_size ?? 24), 100);
    const page = Number(p.params.page ?? 1);
    const results = rows.slice((page - 1) * size, page * size);
    const next = page * size < rows.length ? `admin/product-variants/?page=${page + 1}` : null;
    p.resolve({ data: { count: rows.length, next, previous: null, results } });
  };
  return {
    http: { get } as unknown as OrderEditorVariantsHttp,
    get,
    pending,
    /** Answer every request, including the follow-up pages they trigger, until none are left. */
    async answerAll() {
      for (let guard = 0; guard < 1000; guard += 1) {
        await flush();
        if (pending.length === 0) return;
        while (pending.length) answer(pending.shift()!);
      }
    },
    failAll() {
      while (pending.length) pending.shift()!.reject(new Error("boom"));
    },
  };
}

type FakeApi = ReturnType<typeof createFakeVariantsApi>;

const flush = () => new Promise((r) => setTimeout(r, 0));

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const productIds = (n: number, prefix = "p") =>
  Array.from({ length: n }, (_, i) => `${prefix}${String(i).padStart(3, "0")}`);

type ObserverQueries = ConstructorParameters<typeof QueriesObserver>[1];

/** The editors' useOrderEditorVariants hook is useQueries, i.e. a QueriesObserver. */
function observe(client: QueryClient, fake: FakeApi, ids: string[]) {
  const observer = new QueriesObserver(
    client,
    ids.map((id) => orderEditorVariantsQueryOptions(id, fake.http)) as unknown as ObserverQueries,
  );
  const unsubscribe = observer.subscribe(() => {});
  return {
    observer,
    unsubscribe,
    /** A re-render: the hook hands the observer its queries again. */
    rerender: () =>
      observer.setQueries(
        ids.map((id) => orderEditorVariantsQueryOptions(id, fake.http)) as unknown as ObserverQueries,
      ),
  };
}

/** Requests an editor opening on N cold products costs, re-rendering after every response. */
async function coldEditorRequests(n: number) {
  const client = newClient();
  const fake = createFakeVariantsApi(() => 2);
  const ids = productIds(n);
  const editor = observe(client, fake, ids);
  for (let i = 0; i < 3; i += 1) {
    await fake.answerAll();
    editor.rerender();
  }
  await fake.answerAll();
  return { client, fake, ids, editor, calls: fake.get.mock.calls.length };
}

describe("order editor variants loading", () => {
  it("loads the variants of every cold product in a constant number of requests", async () => {
    const small = await coldEditorRequests(3);
    const large = await coldEditorRequests(12);
    expect(large.calls).toBe(small.calls);
    small.editor.unsubscribe();
    large.editor.unsubscribe();
  });

  it("fills each product's own cache entry with that product's variants", async () => {
    const client = newClient();
    const fake = createFakeVariantsApi((id) => (id === "p001" ? 0 : 3));
    const ids = productIds(4);
    const editor = observe(client, fake, ids);
    await fake.answerAll();
    for (const id of ids) {
      const state = client.getQueryState(orderEditorVariantsQueryKey(id));
      expect(state?.status).toBe("success");
      const data = client.getQueryData<ProductVariant[]>(orderEditorVariantsQueryKey(id)) ?? [];
      expect(data.map((v) => v.product_public_id)).toEqual(
        Array.from({ length: id === "p001" ? 0 : 3 }, () => id),
      );
    }
    editor.unsubscribe();
  });

  it("follows pagination, so no product loses variants past the first page", async () => {
    const client = newClient();
    const fake = createFakeVariantsApi(() => 30);
    const ids = productIds(5);
    const editor = observe(client, fake, ids);
    await fake.answerAll();
    for (const id of ids) {
      expect(client.getQueryData<ProductVariant[]>(orderEditorVariantsQueryKey(id))).toHaveLength(30);
    }
    // 150 rows at 100 per page: bounded by rows, not by products.
    expect(fake.get.mock.calls.length).toBe(2);
    editor.unsubscribe();
  });

  it("asks for at most 100 products per request", async () => {
    const client = newClient();
    const fake = createFakeVariantsApi(() => 0);
    const ids = productIds(150);
    const editor = observe(client, fake, ids);
    await fake.answerAll();
    const asked = fake.get.mock.calls.map((call) => requestedIds(call[1]?.params ?? {}));
    expect(Math.max(...asked.map((batch) => batch.length))).toBeLessThanOrEqual(100);
    expect(new Set(asked.flat())).toEqual(new Set(ids));
    expect(fake.get.mock.calls.length).toBe(2);
    editor.unsubscribe();
  });

  it("requests active variants only (no include_inactive), 100 rows per page", async () => {
    const client = newClient();
    const fake = createFakeVariantsApi();
    const editor = observe(client, fake, ["p1", "p2"]);
    await flush();
    expect(fake.get).toHaveBeenCalledTimes(1);
    expect(fake.get.mock.calls[0][0]).toBe("admin/product-variants/");
    expect(fake.get.mock.calls[0][1]).toEqual({
      params: { product_public_ids: "p1,p2", page_size: 100 },
    });
    await fake.answerAll();
    editor.unsubscribe();
  });

  it("a product added to a loaded editor costs one request for that product only", async () => {
    const client = newClient();
    const fake = createFakeVariantsApi();
    const ids = productIds(6);
    const first = observe(client, fake, ids);
    await fake.answerAll();
    const before = fake.get.mock.calls.length;
    const grown = observe(client, fake, [...ids, "new-product"]);
    await fake.answerAll();
    expect(fake.get.mock.calls.length - before).toBe(1);
    expect(requestedIds(fake.get.mock.calls[before][1]?.params ?? {})).toEqual(["new-product"]);
    first.unsubscribe();
    grown.unsubscribe();
  });

  it("variant focus sweeps never fire a second request for loaded or loading products", async () => {
    const counts: number[] = [];
    for (const n of [3, 12]) {
      const client = newClient();
      const fake = createFakeVariantsApi();
      const ids = productIds(n);
      const sweep = () => ids.forEach((id) => ensureOrderEditorVariants(client, id, fake.http));
      sweep();
      sweep();
      await flush();
      sweep();
      await fake.answerAll();
      sweep();
      await fake.answerAll();
      counts.push(fake.get.mock.calls.length);
    }
    expect(counts[1]).toBe(counts[0]);
  });

  it("does not retry a failed product on later sweeps (empty list, one attempt)", async () => {
    const client = newClient();
    const fake = createFakeVariantsApi();
    ensureOrderEditorVariants(client, "p1", fake.http);
    ensureOrderEditorVariants(client, "p2", fake.http);
    await flush();
    fake.failAll();
    await flush();
    for (const id of ["p1", "p2"]) {
      const state = client.getQueryState(orderEditorVariantsQueryKey(id));
      expect(state?.status).toBe("error");
      expect(state?.errorUpdatedAt).toBeGreaterThan(0);
    }
    const before = fake.get.mock.calls.length;
    ensureOrderEditorVariants(client, "p1", fake.http);
    ensureOrderEditorVariants(client, "p2", fake.http);
    await flush();
    expect(fake.get.mock.calls.length).toBe(before);
  });

  it("stays under the variants root so Variants page saves invalidate it", () => {
    expect(orderEditorVariantsQueryKey("p1").slice(0, variantsQueryKeyRoot.length)).toEqual([
      ...variantsQueryKeyRoot,
    ]);
  });

  it("closing and reopening an editor while entries are fresh costs no requests", async () => {
    const { client, fake, ids, editor } = await coldEditorRequests(12);
    editor.unsubscribe();
    const before = fake.get.mock.calls.length;
    const reopened = observe(client, fake, ids);
    await fake.answerAll();
    expect(fake.get.mock.calls.length).toBe(before);
    reopened.unsubscribe();
  });

  it("an order or stock change makes the next editor mount reload stock in constant requests", async () => {
    const reloads: number[] = [];
    for (const n of [3, 12]) {
      const { client, fake, ids, editor } = await coldEditorRequests(n);
      editor.unsubscribe();
      await invalidateOrderEditorVariants(client);
      const before = fake.get.mock.calls.length;
      const reopened = observe(client, fake, ids);
      await fake.answerAll();
      reloads.push(fake.get.mock.calls.length - before);
      // Fresh again afterwards.
      const again = fake.get.mock.calls.length;
      const third = observe(client, fake, ids);
      await fake.answerAll();
      expect(fake.get.mock.calls.length).toBe(again);
      reopened.unsubscribe();
      third.unsubscribe();
    }
    expect(reloads[0]).toBeGreaterThan(0);
    expect(reloads[1]).toBe(reloads[0]);
  });

  it("an order or stock change refetches an open editor in constant requests", async () => {
    const refetches: number[] = [];
    for (const n of [3, 12]) {
      const { client, fake, editor } = await coldEditorRequests(n);
      const before = fake.get.mock.calls.length;
      await Promise.all([invalidateOrderEditorVariants(client), fake.answerAll()]);
      await fake.answerAll();
      refetches.push(fake.get.mock.calls.length - before);
      editor.unsubscribe();
    }
    expect(refetches[0]).toBeGreaterThan(0);
    expect(refetches[1]).toBe(refetches[0]);
  });

  it("does not touch other variants caches (the Variants page list) on an order change", async () => {
    const client = newClient();
    const otherKey = variantsListQueryKey("p1");
    client.setQueryData(otherKey, []);
    await invalidateOrderEditorVariants(client);
    expect(client.getQueryState(otherKey)?.isInvalidated).toBe(false);
  });

  it("offline, still attempts the request and fails (empty list) instead of waiting in 'Loading'", async () => {
    onlineManager.setOnline(false);
    try {
      const client = newClient();
      const fake = createFakeVariantsApi();
      ensureOrderEditorVariants(client, "p1", fake.http);
      await flush();
      expect(fake.get).toHaveBeenCalledTimes(1);
      fake.failAll();
      await flush();
      const state = client.getQueryState(orderEditorVariantsQueryKey("p1"));
      expect(state?.status).toBe("error");
      expect(state?.fetchStatus).toBe("idle");
    } finally {
      onlineManager.setOnline(true);
    }
  });
});

describe("new order variants failure toasts", () => {
  /** The failures useOrderEditorVariants hands the new order page for these products. */
  function failures(client: QueryClient, ids: string[]) {
    return ids.flatMap((productId) => {
      const state = client.getQueryState(orderEditorVariantsQueryKey(productId));
      return state?.status === "error"
        ? [{ productId, error: state.error, errorUpdatedAt: state.errorUpdatedAt }]
        : [];
    });
  }

  it("reports one failure per failed request, whatever the number of products in it", async () => {
    for (const n of [2, 9]) {
      const client = newClient();
      const fake = createFakeVariantsApi();
      const ids = productIds(n);
      const unreported = createOrderEditorVariantsFailureReporter();
      const editor = observe(client, fake, ids);
      await flush();
      fake.failAll();
      await flush();
      expect(failures(client, ids)).toHaveLength(n);
      expect(unreported(failures(client, ids))).toHaveLength(1);
      // Re-renders hand the same failures again: nothing new to report.
      expect(unreported(failures(client, ids))).toHaveLength(0);

      // A retry (e.g. window refocus) that fails again is a new failure, reported once.
      const retry = client.refetchQueries({ queryKey: ["variants", "order-editor"] });
      await flush();
      fake.failAll();
      await retry;
      expect(unreported(failures(client, ids))).toHaveLength(1);
      editor.unsubscribe();
    }
  });

  it("reports each separately failed product", () => {
    const unreported = createOrderEditorVariantsFailureReporter();
    const a = { productId: "a", error: new Error("a"), errorUpdatedAt: 1 };
    const b = { productId: "b", error: new Error("b"), errorUpdatedAt: 2 };
    expect(unreported([a])).toEqual([a]);
    expect(unreported([a, b])).toEqual([b]);
    expect(unreported([{ ...a, error: new Error("again"), errorUpdatedAt: 3 }])).toHaveLength(1);
  });
});
