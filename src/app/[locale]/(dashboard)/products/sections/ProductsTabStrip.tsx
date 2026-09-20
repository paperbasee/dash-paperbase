"use client";

// Which of the two product views is showing.
//
// Self-contained: it reads and writes the `tab` search param itself, the same
// way the customers strip does, so neither view has to thread state it does not
// otherwise care about.

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export const PRODUCT_TABS = ["products", "wished"] as const;
export type ProductTab = (typeof PRODUCT_TABS)[number];

export function activeProductTab(requested: string | null): ProductTab {
  return PRODUCT_TABS.includes(requested as ProductTab)
    ? (requested as ProductTab)
    : "products";
}

export function ProductsTabStrip() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tPages = useTranslations("pages");

  const active = useMemo(
    () => activeProductTab(searchParams.get("tab")),
    [searchParams]
  );

  const selectTab = useCallback(
    (tab: ProductTab) => {
      if (tab === active) return;
      // The rest of the query string belongs to the view being left -- its
      // page, its filters, its search. The ranking has none of those.
      router.replace(`${pathname}${tab === "products" ? "" : `?tab=${tab}`}`, {
        scroll: false,
      });
    },
    [active, pathname, router]
  );

  return (
    <div
      role="tablist"
      aria-label={tPages("productsTabsAria")}
      className="flex shrink-0 gap-1 rounded-md bg-muted p-0.5"
    >
      {PRODUCT_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          id={`products-tab-${tab}`}
          aria-selected={active === tab}
          aria-controls="products-panel"
          onClick={() => selectTab(tab)}
          className={cn(
            "rounded px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
            active === tab
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab === "products"
            ? tPages("productsTabProducts")
            : tPages("productsTabMostWishedFor")}
        </button>
      ))}
    </div>
  );
}
