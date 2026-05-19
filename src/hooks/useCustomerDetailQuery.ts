"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { CustomerDetailsResponse } from "@/types";
import { customerDetailQueryKey } from "@/lib/query-keys";

export async function fetchCustomerDetail(
  publicId: string,
): Promise<CustomerDetailsResponse> {
  const { data } = await api.get<CustomerDetailsResponse>(
    `admin/customers/${publicId}/details/`,
  );
  return data;
}

export function useCustomerDetailQuery(publicId: string) {
  return useQuery({
    queryKey: customerDetailQueryKey(publicId),
    queryFn: () => fetchCustomerDetail(publicId),
    enabled: !!publicId,
  });
}
