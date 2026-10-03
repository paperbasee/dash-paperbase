"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { usePathname, useRouter } from "@/i18n/navigation";
import { OPEN_PARAM } from "@/lib/open-from-address";

/**
 * A list page opening the one thing its address names -- `?open=<public id>` -- which is how a
 * search result reaches something with no page of its own: a category, a brand, a discount code, a
 * review (lib/search/results.ts `hrefFor`); `?open=new` asks for the add form (lib/open-from-address).
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
    // Once the address no longer names it, the same thing may be asked for again (a second click).
    if (!wanted) {
      handled.current = null;
      return;
    }
    if (!ready || handled.current === wanted) return;
    handled.current = wanted;
    openById(wanted);
    const query = Object.fromEntries([...searchParams.entries()].filter(([name]) => name !== OPEN_PARAM));
    router.replace({ pathname, query }, { scroll: false });
  }, [ready, wanted, openById, searchParams, router, pathname]);
}
