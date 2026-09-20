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

export function useCustomerAccountsQuery(
  params: CustomersListParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: customerAccountsListQueryKey(params),
    queryFn: () => fetchCustomerAccountsList(params),
    enabled: options?.enabled ?? true,
  });
}
