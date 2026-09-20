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

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Undo2 } from "lucide-react";
import { CustomersTab } from "./sections/CustomersTab";
import { AccountsTab } from "./sections/AccountsTab";
import { activeCustomerTab } from "./sections/CustomersTabStrip";

export default function CustomersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tNav = useTranslations("nav");
  const tPages = useTranslations("pages");

  const activeTab = useMemo(
    () => activeCustomerTab(searchParams.get("tab")),
    [searchParams]
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
        id="customers-panel"
        role="tabpanel"
        aria-labelledby={`customers-tab-${activeTab}`}
      >
        {activeTab === "customers" ? <CustomersTab /> : <AccountsTab />}
      </div>
    </div>
  );
}
