"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { SupportTicket, PaginatedResponse } from "@/types";
import {
  supportTicketsListQueryKey,
  type SupportTicketsListParams,
} from "@/lib/query-keys";

export async function fetchSupportTicketsList(
  params: SupportTicketsListParams,
): Promise<PaginatedResponse<SupportTicket>> {
  const { data } = await api.get<PaginatedResponse<SupportTicket>>(
    "admin/support-tickets/",
    { params },
  );
  return data;
}

export function useSupportTicketsQuery(params: SupportTicketsListParams) {
  return useQuery({
    queryKey: supportTicketsListQueryKey(params),
    queryFn: () => fetchSupportTicketsList(params),
  });
}
