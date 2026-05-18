"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useTransition,
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

type NavigationLoadingContextValue = {
  isPending: boolean;
  navigate: (href: string) => void;
};

const NavigationLoadingContext = createContext<NavigationLoadingContextValue | null>(
  null
);

export function NavigationLoadingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (href: string) => {
      const normalized = normalizeNavigationHref(href);
      if (isSameNavigationRoute(normalized, pathname, searchParams)) {
        return;
      }
      startTransition(() => {
        router.push(normalized);
      });
    },
    [pathname, router, searchParams]
  );

  const value = useMemo(
    () => ({
      isPending,
      navigate,
    }),
    [isPending, navigate]
  );

  return (
    <NavigationLoadingContext.Provider value={value}>
      <TopLoadingBar isLoading={isPending} />
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
