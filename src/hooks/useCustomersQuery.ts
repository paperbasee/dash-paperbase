"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Customer, PaginatedResponse } from "@/types";
import { takeRoutePrefetch } from "@/lib/navigation/route-prefetch-cache";
import { customersListQueryKey, type CustomersListParams } from "@/lib/query-keys";

export async function fetchCustomersList(
  params: CustomersListParams
): Promise<PaginatedResponse<Customer>> {
  const isDefaultFetch =
    params.page === 1 &&
    !params.joined_date &&
    !params.is_repeat_customer &&
    !params.search;

  if (isDefaultFetch) {
    const prefetched = takeRoutePrefetch<PaginatedResponse<Customer>>("/customers");
    if (prefetched) return prefetched;
  }

  const { data } = await api.get<PaginatedResponse<Customer>>("admin/customers/", {
    params,
  });
  return data;
}

export function useCustomersQuery(params: CustomersListParams) {
  return useQuery({
    queryKey: customersListQueryKey(params),
    queryFn: () => fetchCustomersList(params),
  });
}
