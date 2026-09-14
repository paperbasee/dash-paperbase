"use client";

import { useQueries } from "@tanstack/react-query";
import {
  orderEditorVariantsQueryOptions,
  type OrderEditorVariantsFailure,
} from "@/lib/orders/order-editor-variants";
import type { ProductVariant } from "@/types";

export type OrderEditorVariantsError = OrderEditorVariantsFailure;

/**
 * Active variants for every product in an order editor, one shared cache entry per product.
 * Products that need loading at the same time share one request. Pass distinct product ids;
 * pass an empty list when the editor is closed.
 */
export function useOrderEditorVariants(productIds: readonly string[]) {
  const results = useQueries({
    queries: productIds.map((productId) => orderEditorVariantsQueryOptions(productId)),
  });

  const variantsByProductId: Record<string, ProductVariant[]> = {};
  const variantsLoadingByProductId: Record<string, boolean> = {};
  const variantErrors: OrderEditorVariantsError[] = [];
  productIds.forEach((productId, index) => {
    const result = results[index];
    if (!result) return;
    variantsByProductId[productId] = result.data ?? [];
    // isPending (no data yet), not isFetching: a background refetch must not flash "Loading".
    variantsLoadingByProductId[productId] = result.isPending;
    if (result.isError && result.data === undefined) {
      variantErrors.push({
        productId,
        error: result.error,
        errorUpdatedAt: result.errorUpdatedAt,
      });
    }
  });

  return { variantsByProductId, variantsLoadingByProductId, variantErrors };
}
