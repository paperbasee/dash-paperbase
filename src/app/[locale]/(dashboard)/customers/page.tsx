"use client";

// Two lists of people, on one screen.
//
// **Customers** is the phone-keyed record the shop has always had, built from
// orders. **Accounts** is shoppers who signed in to the storefront. They are
// separate records and are never merged, so the same person can appear in both
// — expected, not a duplicate to clean up. Letting a merchant link the two by
// hand is agreed for later.
//
// Tabs rather than a second sidebar entry: they are two views of "the people
// who buy here", and a person moving from one list to the other the day they
// sign in would look, from a sidebar, like a customer who vanished.

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomersTab } from "./sections/CustomersTab";
import { AccountsTab } from "./sections/AccountsTab";

const TABS = ["customers", "accounts"] as const;
type Tab = (typeof TABS)[number];

export default function CustomersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tNav = useTranslations("nav");
  const tPages = useTranslations("pages");

  const activeTab: Tab = useMemo(() => {
    const requested = searchParams.get("tab");
    return TABS.includes(requested as Tab) ? (requested as Tab) : "customers";
  }, [searchParams]);

  const selectTab = useCallback(
    (tab: Tab) => {
      if (tab === activeTab) return;
      // Everything else in the query string belongs to the tab being left --
      // its page, its filters, its search. Carrying them across would apply one
      // list's filters to the other and show a result nobody asked for.
      const query = tab === "customers" ? "" : `?tab=${tab}`;
      router.replace(`${pathname}${query}`, { scroll: false });
    },
    [activeTab, pathname, router]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="rounded-card bg-muted/80 px-1 py-1 hidden md:block">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={tPages("goBack")}
            className="flex items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
          >
            <Undo2 className="h-4 w-4" />
          </button>
        </div>
        <div>
          <h1 className="text-2xl font-medium leading-relaxed text-foreground">
            {tNav("customers")}
          </h1>
        </div>
      </div>

      <div
        role="tablist"
        aria-label={tPages("customersTabsAria")}
        className="flex gap-1 rounded-md bg-muted p-0.5 w-fit"
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`customers-tab-${tab}`}
            aria-selected={activeTab === tab}
            aria-controls="customers-panel"
            onClick={() => selectTab(tab)}
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab
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

      <div
        id="customers-panel"
        role="tabpanel"
        aria-labelledby={`customers-tab-${activeTab}`}
      >
        {activeTab === "customers" ? <CustomersTab /> : <AccountsTab />}
      </div>
    </div>
  );
}
