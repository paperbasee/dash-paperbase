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

export function useAbandonedCheckoutsQuery(params: CustomersListParams) {
  return useQuery({
    queryKey: abandonedCheckoutsQueryKey(params),
    queryFn: () => fetchAbandonedCheckouts(params),
  });
}
