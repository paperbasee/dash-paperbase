import { Suspense } from "react";
import VariantsPageClient from "./variants-client";
import { DashboardTableSkeleton } from "@/components/skeletons/dashboard-skeletons";

export default function VariantsPage() {
  return (
    <Suspense
      fallback={
        <DashboardTableSkeleton columns={6} rows={5} showHeader={false} showFilters={false} />
      }
    >
      <VariantsPageClient />
    </Suspense>
  );
}
