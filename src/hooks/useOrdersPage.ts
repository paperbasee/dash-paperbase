"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "@/i18n/navigation";
import {
  markOrderSeen as markOrderSeenApi,
  markOrdersSeen,
} from "@/lib/orders/mark-orders-seen";
import { useOrdersQuery } from "@/hooks/useOrdersQuery";
import { ordersListQueryKey, type OrdersListParams } from "@/lib/query-keys";
import type { Order, PaginatedResponse } from "@/types";

export function useOrdersPage(
  params: OrdersListParams,
  options?: { enabled?: boolean }
) {
  const queryClient = useQueryClient();
  const query = useOrdersQuery(params, options);
  const { data } = query;

  // Keep a live ref to current order IDs so unmount closure always has latest
  const visibleOrderIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (data?.results) {
      visibleOrderIdsRef.current = data.results.map((o) => o.public_id);
    }
  }, [data]);

  const markOrderSeen = useCallback(
    (publicId: string) => {
      queryClient.setQueryData(
        ordersListQueryKey(params),
        (old: PaginatedResponse<Order> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            results: old.results.map((o) =>
              o.public_id === publicId ? { ...o, is_new: false } : o
            ),
          };
        }
      );
      markOrderSeenApi(publicId);
    },
    [queryClient, params]
  );

  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    return () => {
      const isLeavingOrdersPage = !pathnameRef.current.includes("/orders");
      if (isLeavingOrdersPage && visibleOrderIdsRef.current.length > 0) {
        markOrdersSeen(visibleOrderIdsRef.current);
      }
    };
  }, []);

  return { ...query, markOrderSeen };
}
