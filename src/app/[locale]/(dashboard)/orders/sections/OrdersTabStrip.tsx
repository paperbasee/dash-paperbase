"use client";

// Orders, and the ones that got away.
//
// Self-contained: reads and writes the `tab` search param itself, the same way
// the customers and products strips do.

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export const ORDER_TABS = ["orders", "abandoned"] as const;
export type OrderTab = (typeof ORDER_TABS)[number];

export function activeOrderTab(requested: string | null): OrderTab {
  return ORDER_TABS.includes(requested as OrderTab)
    ? (requested as OrderTab)
    : "orders";
}

export function OrdersTabStrip() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tPages = useTranslations("pages");

  const active = useMemo(
    () => activeOrderTab(searchParams.get("tab")),
    [searchParams]
  );

  const selectTab = useCallback(
    (tab: OrderTab) => {
      if (tab === active) return;
      // The rest of the query string belongs to the list being left -- its
      // page, its filters, its date range.
      router.replace(`${pathname}${tab === "orders" ? "" : `?tab=${tab}`}`, {
        scroll: false,
      });
    },
    [active, pathname, router]
  );

  return (
    <div
      role="tablist"
      aria-label={tPages("ordersTabsAria")}
      className="flex shrink-0 gap-1 rounded-md bg-muted p-0.5"
    >
      {ORDER_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          id={`orders-tab-${tab}`}
          aria-selected={active === tab}
          aria-controls="orders-panel"
          onClick={() => selectTab(tab)}
          className={cn(
            "rounded px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
            active === tab
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab === "orders"
            ? tPages("ordersTabOrders")
            : tPages("ordersTabAbandoned")}
        </button>
      ))}
    </div>
  );
}
