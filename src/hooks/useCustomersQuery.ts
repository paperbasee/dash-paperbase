"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Customer, PaginatedResponse } from "@/types";
import { customersListQueryKey, type CustomersListParams } from "@/lib/query-keys";

export async function fetchCustomersList(
  params: CustomersListParams
): Promise<PaginatedResponse<Customer>> {
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
