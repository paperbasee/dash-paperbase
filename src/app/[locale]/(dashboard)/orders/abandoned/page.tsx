"use client";

// People who nearly bought — its own address, reached from the sidebar under
// Orders rather than a tab switch on the orders list.

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/page/PageHeader";
import { AbandonedCheckoutsTab } from "../sections/AbandonedCheckoutsTab";

export default function AbandonedCheckoutsPage() {
  const tPages = useTranslations("pages");
  const tHints = useTranslations("pageHints");

  return (
    <div className="space-y-6">
      <PageHeader title={tPages("ordersTabAbandoned")} hint={tHints("abandoned")} />
      <AbandonedCheckoutsTab />
    </div>
  );
}
