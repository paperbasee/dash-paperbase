"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { SupportTicket } from "@/types";
import { supportTicketDetailQueryKey } from "@/lib/query-keys";

export async function fetchSupportTicketDetail(
  publicId: string,
): Promise<SupportTicket> {
  const { data } = await api.get<SupportTicket>(
    `admin/support-tickets/${publicId}/`,
  );
  return data;
}

export function useSupportTicketDetailQuery(publicId: string) {
  return useQuery({
    queryKey: supportTicketDetailQueryKey(publicId),
    queryFn: () => fetchSupportTicketDetail(publicId),
    enabled: !!publicId,
  });
}
