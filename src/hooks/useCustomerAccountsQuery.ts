"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { CustomerAccount, PaginatedResponse } from "@/types";
import {
  customerAccountsListQueryKey,
  type CustomersListParams,
} from "@/lib/query-keys";

export async function fetchCustomerAccountsList(
  params: CustomersListParams
): Promise<PaginatedResponse<CustomerAccount>> {
  const { data } = await api.get<PaginatedResponse<CustomerAccount>>(
    "admin/customer-accounts/",
    { params }
  );
  return data;
}

/**
 * Always refetched, like the abandoned-checkout and most-wished-for lists.
 *
 * A row appears here when a SHOPPER signs in -- on the storefront, where the
 * dashboard has no event to hear. There is nothing to invalidate on, so the
 * copy we hold cannot be trusted. Two minutes is right for lists the dashboard
 * itself changes and wrong for the three that shoppers fill.
 */
export function useCustomerAccountsQuery(
  params: CustomersListParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: customerAccountsListQueryKey(params),
    queryFn: () => fetchCustomerAccountsList(params),
    enabled: options?.enabled ?? true,
    staleTime: 0,
    refetchOnMount: "always",
  });
}
