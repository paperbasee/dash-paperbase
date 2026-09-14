import { queryOptions, type QueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { variantsQueryKeyRoot } from "@/lib/query-keys";
import type { PaginatedResponse, ProductVariant } from "@/types";

export type OrderEditorVariantsHttp = Pick<typeof api, "get">;

/**
 * Active variants of one product, as the order editors (order edit + new order) show them.
 *
 * Kept under the variants root so a variant saved on the Variants page invalidates it. It must not
 * share `variantsListQueryKey`: that fetcher sends include_inactive=true, the editors must not.
 */
export function orderEditorVariantsQueryKey(productId: string) {
  return [...variantsQueryKeyRoot, "order-editor", productId] as const;
}

export async function fetchOrderEditorVariants(
  productId: string,
  http: OrderEditorVariantsHttp = api,
): Promise<ProductVariant[]> {
  const { data } = await http.get<PaginatedResponse<ProductVariant> | ProductVariant[]>(
    "admin/product-variants/",
    { params: { product_public_id: productId } },
  );
  const list = Array.isArray(data) ? data : data.results;
  return list ?? [];
}

/**
 * One cache entry per product. React Query collapses concurrent requests for the same key, so an
 * editor with N products costs at most N requests, and none while the entries are fresh.
 */
export function orderEditorVariantsQueryOptions(
  productId: string,
  http: OrderEditorVariantsHttp = api,
) {
  return queryOptions({
    queryKey: orderEditorVariantsQueryKey(productId),
    queryFn: () => fetchOrderEditorVariants(productId, http),
    staleTime: 2 * 60 * 1000,
    // The editors have always made a single attempt and shown an empty variant list on failure.
    retry: false,
  });
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
