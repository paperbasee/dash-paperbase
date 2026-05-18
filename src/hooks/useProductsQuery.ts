"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { PaginatedResponse, Product } from "@/types";
import { productsListQueryKey, type ProductsListParams } from "@/lib/query-keys";

export async function fetchProductsList(
  params: ProductsListParams
): Promise<PaginatedResponse<Product>> {
  const { data } = await api.get<PaginatedResponse<Product>>("admin/products/", {
    params,
  });
  return data;
}

export function useProductsQuery(params: ProductsListParams) {
  return useQuery({
    queryKey: productsListQueryKey(params),
    queryFn: () => fetchProductsList(params),
  });
}
