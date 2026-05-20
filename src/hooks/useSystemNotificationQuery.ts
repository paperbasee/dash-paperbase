"use client";

import { useQuery } from "@tanstack/react-query";
import { getActiveSystemNotification } from "@/lib/api/systemNotification";
import { systemNotificationActiveQueryKey } from "@/lib/query-keys";

const STALE_MS = 5 * 60 * 1000;

export function useSystemNotificationQuery() {
  const query = useQuery({
    queryKey: systemNotificationActiveQueryKey,
    queryFn: getActiveSystemNotification,
    staleTime: STALE_MS,
  });

  return {
    notification: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
