"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  productVariantsQueryOptions,
  variantAttributesQueryOptions,
  variantProductDetailQueryOptions,
  variantProductSearchQueryOptions,
  variantSearchInfiniteQueryOptions,
} from "@/lib/variants/variants-queries";

/** Picker options for the typed search; only loads while the picker is open. */
export function useVariantProductSearchQuery(search: string, enabled: boolean) {
  return useQuery({ ...variantProductSearchQueryOptions(search), enabled });
}

export function useVariantProductQuery(productId: string) {
  return useQuery(variantProductDetailQueryOptions(productId));
}

export function useVariantAttributesQuery() {
  return useQuery(variantAttributesQueryOptions());
}

/** Every variant of the selected product. */
export function useProductVariantsQuery(productId: string) {
  return useQuery(productVariantsQueryOptions(productId));
}

/** Store-wide SKU/option search, one page at a time. */
export function useVariantSearchQuery(search: string, status: string, enabled: boolean) {
  return useInfiniteQuery({
    ...variantSearchInfiniteQueryOptions(search, status),
    enabled: enabled && !!search.trim(),
  });
}
