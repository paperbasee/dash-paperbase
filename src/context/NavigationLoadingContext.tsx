"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { TopLoadingBar } from "@/components/TopLoadingBar";
import {
  buildCurrentRouteKey,
  isSameNavigationRoute,
  normalizeNavigationHref,
} from "@/lib/navigation/normalize-navigation-href";
import { getPrefetchFn } from "@/lib/navigation/route-prefetch-registry";

const NAVIGATION_TIMEOUT_MS = 8_000;
const NAVIGATION_FINISH_FALLBACK_MS = 5_000;
const NAVIGATION_COOLDOWN_MS = 300;

type NavigationLoadingContextValue = {
  isNavigating: boolean;
  isJustNavigated: boolean;
  startNavigation: (href: string, fetchFn?: () => Promise<void>) => Promise<void>;
  cancelNavigation: () => void;
  registerPageLoading: (active: boolean) => void;
};

const NavigationLoadingContext = createContext<NavigationLoadingContextValue | null>(
  null
);

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = setTimeout(() => resolve(), ms);
    const onAbort = () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function NavigationLoadingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [isJustNavigated, setIsJustNavigated] = useState(false);

  const epochRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const pageLoadingCountRef = useRef(0);
  const justNavigatedRef = useRef(false);
  const justNavigatedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearJustNavigated = useCallback(() => {
    if (justNavigatedTimeoutRef.current) {
      clearTimeout(justNavigatedTimeoutRef.current);
      justNavigatedTimeoutRef.current = null;
    }
    justNavigatedRef.current = false;
    setIsJustNavigated(false);
  }, []);

  const markJustNavigated = useCallback(() => {
    if (justNavigatedTimeoutRef.current) {
      clearTimeout(justNavigatedTimeoutRef.current);
    }
    justNavigatedRef.current = true;
    setIsJustNavigated(true);
    justNavigatedTimeoutRef.current = setTimeout(() => {
      justNavigatedRef.current = false;
      setIsJustNavigated(false);
      justNavigatedTimeoutRef.current = null;
    }, NAVIGATION_COOLDOWN_MS);
  }, []);

  const cancelNavigation = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    clearJustNavigated();
  }, [clearJustNavigated]);

  const registerPageLoading = useCallback((active: boolean) => {
    if (active) {
      pageLoadingCountRef.current += 1;
    } else {
      pageLoadingCountRef.current = Math.max(0, pageLoadingCountRef.current - 1);
    }
    setPageLoading(pageLoadingCountRef.current > 0);
  }, []);

  const startNavigation = useCallback(
    async (href: string, fetchFn?: () => Promise<void>) => {
      const normalized = normalizeNavigationHref(href);

      if (isSameNavigationRoute(normalized, pathname, searchParams)) {
        return;
      }

      cancelNavigation();
      const epoch = ++epochRef.current;
      const controller = new AbortController();
      abortRef.current = controller;

      clearJustNavigated();
      setIsNavigating(true);

      const finishNavigation = () => {
        if (epoch !== epochRef.current) return;
        setIsNavigating(false);
        abortRef.current = null;
        markJustNavigated();
      };

      const fallbackId = window.setTimeout(
        finishNavigation,
        NAVIGATION_FINISH_FALLBACK_MS
      );

      const prefetch =
        fetchFn ?? getPrefetchFn(normalized, (h) => router.prefetch(h));

      try {
        try {
          await Promise.race([
            prefetch(controller.signal),
            delay(NAVIGATION_TIMEOUT_MS, controller.signal),
          ]);
        } catch {
          // Navigate on failure, timeout, or abort; page handles errors after route change.
        }

        if (epoch !== epochRef.current) {
          return;
        }

        if (controller.signal.aborted) {
          return;
        }

        router.push(normalized);
      } finally {
        window.clearTimeout(fallbackId);
        finishNavigation();
      }
    },
    [cancelNavigation, clearJustNavigated, markJustNavigated, pathname, router, searchParams]
  );

  const value = useMemo(
    () => ({
      isNavigating,
      isJustNavigated,
      startNavigation,
      cancelNavigation,
      registerPageLoading,
    }),
    [
      cancelNavigation,
      isJustNavigated,
      isNavigating,
      registerPageLoading,
      startNavigation,
    ]
  );

  return (
    <NavigationLoadingContext.Provider value={value}>
      <TopLoadingBar isLoading={isNavigating || pageLoading} />
      {children}
    </NavigationLoadingContext.Provider>
  );
}

export function useNavigationLoading(): NavigationLoadingContextValue {
  const ctx = useContext(NavigationLoadingContext);
  if (!ctx) {
    throw new Error(
      "useNavigationLoading must be used within NavigationLoadingProvider"
    );
  }
  return ctx;
}

export function useNavigationLoadingOptional(): NavigationLoadingContextValue | null {
  return useContext(NavigationLoadingContext);
}

/** Current route key for prefetch hydration on mounted pages. */
export function useCurrentRouteKey(): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return buildCurrentRouteKey(pathname, searchParams);
}
