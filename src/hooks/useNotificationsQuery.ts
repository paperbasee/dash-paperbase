"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Notification, PaginatedResponse } from "@/types";
import { notificationsQueryKey } from "@/lib/query-keys";

export async function fetchNotifications(): Promise<Notification[]> {
  const { data } = await api.get<PaginatedResponse<Notification> | Notification[]>(
    "admin/notifications/",
  );
  return Array.isArray(data) ? data : data.results;
}

export function useNotificationsQuery() {
  return useQuery({
    queryKey: notificationsQueryKey,
    queryFn: fetchNotifications,
  });
}
