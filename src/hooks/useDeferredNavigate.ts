"use client";

import { useCallback } from "react";
import { useNavigationLoading } from "@/context/NavigationLoadingContext";

export function useDeferredNavigate() {
  const { startNavigation } = useNavigationLoading();

  const navigate = useCallback(
    async (href: string, fetchFn?: () => Promise<void>) => {
      await startNavigation(href, fetchFn);
    },
    [startNavigation]
  );

  return navigate;
}
