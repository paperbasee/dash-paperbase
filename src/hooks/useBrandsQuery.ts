"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { AdminBrand } from "@/types";
import { brandsQueryKey } from "@/lib/query-keys";

/**
 * The shop's brands.
 *
 * Read in two places -- the Brands page and the picker on the product form --
 * and they share the cache, so opening a product after adding a brand does not
 * fetch the list again. It is also why the picker's inline create can simply
 * invalidate this key and have both screens agree.
 *
 * Unpaginated on purpose: a shop has tens of brands, not thousands, and a
 * picker that only offers the first page is a picker that hides brands.
 */
export async function fetchBrands(): Promise<AdminBrand[]> {
  const { data } = await api.get<AdminBrand[]>("admin/brands/");
  return Array.isArray(data) ? data : [];
}

export function useBrandsQuery() {
  return useQuery({
    queryKey: brandsQueryKey,
    queryFn: fetchBrands,
  });
}
