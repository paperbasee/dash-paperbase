"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { AbandonedCheckout, PaginatedResponse } from "@/types";
import {
  abandonedCheckoutsQueryKey,
  type CustomersListParams,
} from "@/lib/query-keys";

export async function fetchAbandonedCheckouts(
  params: CustomersListParams
): Promise<PaginatedResponse<AbandonedCheckout>> {
  const { data } = await api.get<PaginatedResponse<AbandonedCheckout>>(
    "admin/abandoned-checkouts/",
    { params }
  );
  return data;
}

/**
 * Always refetched, unlike every other list in the dashboard.
 *
 * The app-wide default holds a list for two minutes (`QueryProvider`), which
 * is right for lists you read. This is a list you ACT on: a merchant works
 * down it with a phone in their hand, and the one thing that must not happen
 * is ringing somebody to ask why they did not order when they already have.
 *
 * A row leaves this list the moment the shopper checks out -- on the
 * storefront, where the dashboard has no event to hear. So there is nothing to
 * invalidate on, and the only honest answer is not to trust the copy we hold.
 *
 * It costs one request per visit and no flicker: the cached rows still paint
 * immediately and are replaced when the answer lands.
 */
const ABANDONED_STALE_MS = 0;

export function useAbandonedCheckoutsQuery(params: CustomersListParams) {
  return useQuery({
    queryKey: abandonedCheckoutsQueryKey(params),
    queryFn: () => fetchAbandonedCheckouts(params),
    staleTime: ABANDONED_STALE_MS,
    // Explicit rather than relying on "stale implies refetch": a later change
    // to the shared default must not quietly make this list stop refreshing.
    refetchOnMount: "always",
  });
}
