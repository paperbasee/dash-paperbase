"use client";

// Which of the two lists is showing.
//
// It lives inside each tab's own toolbar row rather than on a row of its own,
// so the switch sits in line with that list's filter pills instead of pushing
// them down a line.
//
// Self-contained: it reads and writes the `tab` search param itself, so neither
// tab has to thread state it does not otherwise care about.

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export const CUSTOMER_TABS = ["customers", "accounts"] as const;
export type CustomerTab = (typeof CUSTOMER_TABS)[number];

export function activeCustomerTab(requested: string | null): CustomerTab {
  return CUSTOMER_TABS.includes(requested as CustomerTab)
    ? (requested as CustomerTab)
    : "customers";
}

export function CustomersTabStrip() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tPages = useTranslations("pages");

  const active = useMemo(
    () => activeCustomerTab(searchParams.get("tab")),
    [searchParams]
  );

  const selectTab = useCallback(
    (tab: CustomerTab) => {
      if (tab === active) return;
      // Everything else in the query string belongs to the list being left --
      // its page, its filters, its search. Carrying them across would apply one
      // list's filters to the other and show a result nobody asked for.
      router.replace(`${pathname}${tab === "customers" ? "" : `?tab=${tab}`}`, {
        scroll: false,
      });
    },
    [active, pathname, router]
  );

  return (
    <div
      role="tablist"
      aria-label={tPages("customersTabsAria")}
      className="flex shrink-0 gap-1 rounded-md bg-muted p-0.5"
    >
      {CUSTOMER_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          id={`customers-tab-${tab}`}
          aria-selected={active === tab}
          aria-controls="customers-panel"
          onClick={() => selectTab(tab)}
          className={cn(
            "rounded px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
            active === tab
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab === "customers"
            ? tPages("customersTabCustomers")
            : tPages("customersTabAccounts")}
        </button>
      ))}
    </div>
  );
}
