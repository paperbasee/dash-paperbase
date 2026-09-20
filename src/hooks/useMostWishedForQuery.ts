"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { MostWishedForProduct } from "@/types";
import { mostWishedForQueryKey } from "@/lib/query-keys";

/**
 * Deliberately not paginated — the endpoint returns a capped top list. A
 * ranking shifts every time anybody saves anything, so a cursor into it points
 * at a position that no longer holds.
 */
export async function fetchMostWishedFor(): Promise<MostWishedForProduct[]> {
  const { data } = await api.get<MostWishedForProduct[]>(
    "admin/products/most-wished-for/"
  );
  return data;
}

export function useMostWishedForQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: mostWishedForQueryKey,
    queryFn: fetchMostWishedFor,
    enabled: options?.enabled ?? true,
  });
}
