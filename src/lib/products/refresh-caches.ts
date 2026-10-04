import type { QueryClient } from "@tanstack/react-query";

import {
  inventoryStatusQueryKey,
  navCountsQueryKey,
  productDetailQueryKey,
  productsListQueryKeyRoot,
} from "@/lib/query-keys";

/**
 * After a product is added, changed or deleted: everything the dashboard keeps of it asks the API
 * again -- the lists, the sidebar counts, the stock counts and, given its id, the product itself.
 *
 * The product's own copy was missing (owner, 2026-10-04: a new photo took minutes to show). It is
 * kept two minutes and on the device, so the page a save lands on drew the old photos until
 * something made it ask again. Awaited, so that page opens on the new copy.
 */
export async function refreshProductCaches(queryClient: QueryClient, publicId?: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: productsListQueryKeyRoot }),
    queryClient.invalidateQueries({ queryKey: navCountsQueryKey }),
    queryClient.invalidateQueries({ queryKey: inventoryStatusQueryKey }),
    publicId ? queryClient.invalidateQueries({ queryKey: productDetailQueryKey(publicId) }) : undefined,
  ]);
}
