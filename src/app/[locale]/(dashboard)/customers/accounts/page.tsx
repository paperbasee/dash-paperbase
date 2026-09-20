"use client";

// Shoppers who signed in — its own address, in the sidebar under Customers.
//
// The detail page for one of them already lives a level below, at
// `accounts/[public_id]`, so this is the list above it rather than a tab
// somewhere else.

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Undo2 } from "lucide-react";
import { AccountsTab } from "../sections/AccountsTab";

export default function CustomerAccountsPage() {
  const router = useRouter();
  const tPages = useTranslations("pages");

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
        <h1 className="text-2xl font-medium leading-relaxed text-foreground">
          {tPages("customersTabAccounts")}
        </h1>
      </div>
      <AccountsTab />
    </div>
  );
}
