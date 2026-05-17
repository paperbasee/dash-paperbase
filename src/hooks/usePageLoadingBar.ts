"use client";

import { useEffect } from "react";
import { useIsRestoring } from "@tanstack/react-query";
import { useNavigationLoadingOptional } from "@/context/NavigationLoadingContext";

/** Drives the global top bar during page data fetches (e.g. direct URL visits). */
export function usePageLoadingBar(isQueryLoading: boolean): void {
  const ctx = useNavigationLoadingOptional();
  const isRestoring = useIsRestoring();
  const showBar = isQueryLoading && !isRestoring;

  useEffect(() => {
    if (!ctx) return;
    ctx.registerPageLoading(showBar);
    return () => ctx.registerPageLoading(false);
  }, [ctx, showBar]);
}
