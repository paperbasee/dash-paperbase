"use client";

import { useQuery } from "@tanstack/react-query";

import api from "@/lib/api";
import { storeQueryKey } from "@/lib/query-keys";

/**
 * The shop's live address, for every team member: GET store/ `storefront_url`, the primary domain
 * that is serving (a connected own domain, otherwise the Paperbase one). "" until it has arrived, or
 * while the shop has no address serving.
 */
export function useStorefrontUrl(): string {
  const { data } = useQuery({
    queryKey: storeQueryKey,
    queryFn: async () => (await api.get<{ storefront_url?: string }>("store/")).data,
    staleTime: 5 * 60_000,
  });
  return data?.storefront_url ?? "";
}
