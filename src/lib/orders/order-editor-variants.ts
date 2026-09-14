import { queryOptions, type QueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { orderEditorVariantsQueryKey, orderEditorVariantsQueryKeyRoot } from "@/lib/query-keys";
import type { PaginatedResponse, ProductVariant } from "@/types";

export { orderEditorVariantsQueryKey, orderEditorVariantsQueryKeyRoot };

export type OrderEditorVariantsHttp = Pick<typeof api, "get">;

/** The API accepts at most 100 ids in `product_public_ids`. */
export const ORDER_EDITOR_VARIANTS_BATCH_SIZE = 100;

/** The API's largest page for admin/product-variants/. */
const ORDER_EDITOR_VARIANTS_PAGE_SIZE = 100;

/**
 * Each variant carries available_quantity, which orders (create, edit, cancel, status changes),
 * inventory adjustments and product saves move. Call after any of them so an open editor reloads
 * stock now and a closed one reloads on next open, instead of showing stock (and capping
 * quantities) from before the change.
 */
export function invalidateOrderEditorVariants(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: orderEditorVariantsQueryKeyRoot });
}

/**
 * Active variants of up to 100 products in one request, following every page. The result has an
 * entry for each requested product, empty when the API returned no rows for it (no active
 * variants, not in the store, or outside the member's categories).
 */
export async function fetchOrderEditorVariantsBatch(
  productIds: readonly string[],
  http: OrderEditorVariantsHttp = api,
): Promise<Map<string, ProductVariant[]>> {
  const byProduct = new Map<string, ProductVariant[]>(productIds.map((id) => [id, []]));
  if (productIds.length === 0) return byProduct;
  const params = {
    product_public_ids: productIds.join(","),
    page_size: ORDER_EDITOR_VARIANTS_PAGE_SIZE,
  };
  for (let page = 1; ; page += 1) {
    const { data } = await http.get<PaginatedResponse<ProductVariant> | ProductVariant[]>(
      "admin/product-variants/",
      { params: page === 1 ? params : { ...params, page } },
    );
    const rows = (Array.isArray(data) ? data : data.results) ?? [];
    for (const row of rows) byProduct.get(row.product_public_id)?.push(row);
    if (Array.isArray(data) || !data.next || rows.length === 0) return byProduct;
  }
}

type Waiter = { resolve: (rows: ProductVariant[]) => void; reject: (err: unknown) => void };

/**
 * Collects the per-product loads started in the same tick (an editor mounting on N products, an
 * invalidation or window focus refetching them, a focus sweep) into one batched request, then
 * hands each product's cache entry its own rows. The cache stays one entry per product.
 */
function createOrderEditorVariantsLoader(http: OrderEditorVariantsHttp) {
  let queued: Map<string, Waiter[]> | null = null;

  function dispatch(batch: Map<string, Waiter[]>) {
    const ids = [...batch.keys()];
    for (let start = 0; start < ids.length; start += ORDER_EDITOR_VARIANTS_BATCH_SIZE) {
      const chunk = ids.slice(start, start + ORDER_EDITOR_VARIANTS_BATCH_SIZE);
      fetchOrderEditorVariantsBatch(chunk, http).then(
        (byProduct) => {
          for (const id of chunk) {
            for (const waiter of batch.get(id) ?? []) waiter.resolve(byProduct.get(id) ?? []);
          }
        },
        (err: unknown) => {
          for (const id of chunk) {
            for (const waiter of batch.get(id) ?? []) waiter.reject(err);
          }
        },
      );
    }
  }

  return {
    load(productId: string): Promise<ProductVariant[]> {
      return new Promise<ProductVariant[]>((resolve, reject) => {
        if (!queued) {
          const batch = new Map<string, Waiter[]>();
          queued = batch;
          queueMicrotask(() => {
            queued = null;
            dispatch(batch);
          });
        }
        const waiters = queued.get(productId);
        if (waiters) waiters.push({ resolve, reject });
        else queued.set(productId, [{ resolve, reject }]);
      });
    },
  };
}

const loaders = new WeakMap<OrderEditorVariantsHttp, ReturnType<typeof createOrderEditorVariantsLoader>>();

/** One product's active variants, batched with every other product loaded in the same tick. */
export function loadOrderEditorVariants(
  productId: string,
  http: OrderEditorVariantsHttp = api,
): Promise<ProductVariant[]> {
  let loader = loaders.get(http);
  if (!loader) {
    loader = createOrderEditorVariantsLoader(http);
    loaders.set(http, loader);
  }
  return loader.load(productId);
}

/**
 * One cache entry per product. React Query collapses concurrent requests for the same key and the
 * loader collapses the products into one request, so an editor with N cold products costs one
 * request (more only past 100 products or 100 variant rows), and none while the entries are fresh.
 */
export function orderEditorVariantsQueryOptions(
  productId: string,
  http: OrderEditorVariantsHttp = api,
) {
  return queryOptions({
    queryKey: orderEditorVariantsQueryKey(productId),
    queryFn: () => loadOrderEditorVariants(productId, http),
    staleTime: 2 * 60 * 1000,
    // The editors have always made a single attempt and shown an empty variant list on failure.
    retry: false,
    // Offline, attempt the request and fail (empty list, as before) rather than pausing the query
    // in "Loading" until the connection returns.
    networkMode: "always",
  });
}

export type OrderEditorVariantsFailure = {
  productId: string;
  error: unknown;
  /** Changes on every failed attempt. */
  errorUpdatedAt: number;
};

/**
 * Picks the variant load failures to report, once per failed request: a product's failure is
 * reported once per attempt (a retry that fails again is new), and products that failed in the
 * same batched request share one error, which is reported once.
 */
export function createOrderEditorVariantsFailureReporter() {
  const reportedAt = new Map<string, number>();
  const reportedErrors = new WeakSet<object>();
  return function unreported<T extends OrderEditorVariantsFailure>(failures: readonly T[]): T[] {
    const fresh: T[] = [];
    for (const failure of failures) {
      if (reportedAt.get(failure.productId) === failure.errorUpdatedAt) continue;
      reportedAt.set(failure.productId, failure.errorUpdatedAt);
      const { error } = failure;
      if (error !== null && typeof error === "object") {
        if (reportedErrors.has(error)) continue;
        reportedErrors.add(error);
      }
      fresh.push(failure);
    }
    return fresh;
  };
}

/**
 * Start loading a product's variants unless an entry already exists (loaded, loading or failed).
 * Safe to call on every focus or render: it never fires a second request for the same product.
 */
export function ensureOrderEditorVariants(
  queryClient: QueryClient,
  productId: string,
  http: OrderEditorVariantsHttp = api,
): void {
  if (!productId) return;
  const options = orderEditorVariantsQueryOptions(productId, http);
  if (queryClient.getQueryState(options.queryKey)) return;
  void queryClient.prefetchQuery(options);
}
