"use client";

import { useEffect } from "react";
import { useIsRestoring } from "@tanstack/react-query";
import { useNavigationLoadingOptional } from "@/context/NavigationLoadingContext";

/** Drives the global top bar during page data fetches (e.g. direct URL visits). */
export function usePageLoadingBar(isQueryLoading: boolean): void {
  const ctx = useNavigationLoadingOptional();
  const isRestoring = useIsRestoring();
  const isJustNavigated = ctx?.isJustNavigated ?? false;
  const showBar = isQueryLoading && !isRestoring && !isJustNavigated;

  useEffect(() => {
    if (!ctx) return;
    ctx.registerPageLoading(showBar);
    return () => ctx.registerPageLoading(false);
  }, [ctx, showBar]);
}

/**
 * Show the bar only on cold load (no data yet). Skips when React Query serves
 * prefetched/cached data after deferred navigation; never shows for isFetching alone.
 */
export function useQueryPageLoadingBar(isLoading: boolean, data: unknown): void {
  usePageLoadingBar(Boolean(isLoading && data == null));
}
