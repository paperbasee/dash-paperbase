"use client";

import { takeRoutePrefetch } from "@/lib/navigation/route-prefetch-cache";
import { normalizeNavigationHref } from "@/lib/navigation/normalize-navigation-href";

export function useRoutePrefetchHydration<T>(href: string): T | null {
  return takeRoutePrefetch<T>(normalizeNavigationHref(href));
}

export { takeRoutePrefetch, setRoutePrefetch } from "@/lib/navigation/route-prefetch-cache";
