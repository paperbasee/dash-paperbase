"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Product } from "@/types";
import { productDetailQueryKey } from "@/lib/query-keys";

const STALE_MS = 2 * 60 * 1000;

export async function fetchProductDetail(publicId: string): Promise<Product> {
  const { data } = await api.get<Product>(`admin/products/${publicId}/`);
  return data;
}

export function useProductDetailQuery(publicId: string) {
  const query = useQuery({
    queryKey: productDetailQueryKey(publicId),
    queryFn: () => fetchProductDetail(publicId),
    enabled: !!publicId,
    staleTime: STALE_MS,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
