import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { parsePageSize, type PageSize } from "@/lib/paging";

type FilterMap = Record<string, string>;

function parsePage(value: string | null): number {
  const parsed = Number(value || "1");
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

export function useFilters(filterKeys: string[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = useMemo(() => parsePage(searchParams.get("page")), [searchParams]);

  // How many rows a page holds, kept in the web address beside the page so a refresh, the back
  // button and a pasted link all show the list the merchant was looking at.
  const pageSize = useMemo(() => parsePageSize(searchParams.get("per")), [searchParams]);

  const filters = useMemo<FilterMap>(() => {
    const out: FilterMap = {};
    for (const key of filterKeys) {
      const value = searchParams.get(key);
      if (value) out[key] = value;
    }
    return out;
  }, [filterKeys, searchParams]);

  const applyParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const setFilter = useCallback(
    (key: string, value?: string | null) => {
      applyParams((params) => {
        if (value && value.trim()) params.set(key, value.trim());
        else params.delete(key);
        params.delete("page");
      });
    },
    [applyParams]
  );

  const setPage = useCallback(
    (nextPage: number) => {
      applyParams((params) => {
        if (nextPage <= 1) params.delete("page");
        else params.set("page", String(nextPage));
      });
    },
    [applyParams]
  );

  const setPageSize = useCallback(
    (nextSize: PageSize) => {
      applyParams((params) => {
        // A bigger page holds the rows of several old ones, so the old page number means
        // nothing now: back to the first.
        params.delete("page");
        if (nextSize === parsePageSize(null)) params.delete("per");
        else params.set("per", String(nextSize));
      });
    },
    [applyParams]
  );

  const clearFilters = useCallback(() => {
    applyParams((params) => {
      for (const key of filterKeys) params.delete(key);
      params.delete("page");
    });
  }, [applyParams, filterKeys]);

  return { page, pageSize, filters, setFilter, setPage, setPageSize, clearFilters };
}
