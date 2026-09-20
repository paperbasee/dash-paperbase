"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { CustomerAccountDetailsResponse } from "@/types";
import { customerAccountDetailQueryKey } from "@/lib/query-keys";

export async function fetchCustomerAccountDetail(
  publicId: string
): Promise<CustomerAccountDetailsResponse> {
  const { data } = await api.get<CustomerAccountDetailsResponse>(
    `admin/customer-accounts/${publicId}/details/`
  );
  return data;
}

export function useCustomerAccountDetailQuery(publicId: string) {
  return useQuery({
    queryKey: customerAccountDetailQueryKey(publicId),
    queryFn: () => fetchCustomerAccountDetail(publicId),
    enabled: !!publicId,
  });
}
