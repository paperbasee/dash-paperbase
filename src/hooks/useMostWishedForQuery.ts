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

/**
 * Always refetched, like the abandoned-checkout list and for the same reason.
 *
 * This list changes when a SHOPPER does something -- saves a product, signs
 * in -- and that happens on the storefront, where the dashboard has no event
 * to hear. There is nothing to invalidate on, so the only honest answer is
 * not to trust the copy we hold. The app-wide two minutes is right for lists
 * the dashboard itself changes; it is wrong here, where a merchant checks
 * whether the thing they just tested actually arrived.
 *
 * Cached rows still paint immediately, so there is no flicker -- they are
 * replaced when the answer lands.
 */
export function useMostWishedForQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: mostWishedForQueryKey,
    queryFn: fetchMostWishedFor,
    enabled: options?.enabled ?? true,
    staleTime: 0,
    refetchOnMount: "always",
  });
}
