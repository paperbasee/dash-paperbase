"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Fetch the page a merchant is pointing at, just before they click it.
 *
 * Handed to `Pager`'s `onPrefetch`, which fires on hover and on focus and at no other time: a
 * page nobody opens costs the database nothing, while the one they are reaching for is usually
 * here by the time the click lands. Pages already fetched come from the query cache, so a
 * second hover is free.
 */
export function usePrefetchPage<P extends object, T>(
  current: number,
  paramsForPage: (page: number) => P,
  queryKeyFor: (params: P) => readonly unknown[],
  fetcher: (params: P) => Promise<T>
) {
  const queryClient = useQueryClient();
  return useCallback(
    (wanted: number) => {
      if (wanted === current) return;
      const params = paramsForPage(wanted);
      void queryClient.prefetchQuery({
        queryKey: queryKeyFor(params),
        queryFn: () => fetcher(params),
      });
    },
    [current, fetcher, paramsForPage, queryClient, queryKeyFor]
  );
}
