"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { usePathname, useRouter } from "@/i18n/navigation";

/** The address parameter naming the one thing a list page should open. */
export const OPEN_PARAM = "open";

/**
 * A list page opening the one thing its address names -- `?open=<public id>` -- which is how a
 * search result reaches something with no page of its own: a category, a brand, a discount code, a
 * review (lib/search/results.ts `hrefFor`).
 *
 * Once the list has loaded (`ready`), `openById` opens it and says whether it was there; either
 * way `open` then leaves the address, so a refresh or Back does not open it again. Anything else
 * the address holds (a tab) stays.
 */
export function useOpenFromAddress(ready: boolean, openById: (publicId: string) => boolean): void {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const wanted = searchParams.get(OPEN_PARAM);
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !wanted || handled.current === wanted) return;
    handled.current = wanted;
    openById(wanted);
    const query = Object.fromEntries([...searchParams.entries()].filter(([name]) => name !== OPEN_PARAM));
    router.replace({ pathname, query }, { scroll: false });
  }, [ready, wanted, openById, searchParams, router, pathname]);
}
