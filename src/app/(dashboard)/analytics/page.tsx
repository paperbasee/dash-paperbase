"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Undo2 } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import DashboardBarChart from "@/components/DashboardBarChart";
import DateRangeFilter, {
  DateRangeValue,
} from "@/components/DateRangeFilter";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";

export default function AnalyticsPage() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);

  const [range, setRange] = useState<DateRangeValue>(() => {
    const end = today;
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
      bucket: "day",
      preset: "last30",
    };
  });

  const { data, loading, error } = useDashboardAnalytics({
    startDate: range.startDate,
    endDate: range.endDate,
    bucket: range.bucket,
  });

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted/80 px-1 py-1">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <div>
            <h1 className="text-2xl font-medium text-foreground">
              Analytics
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Store insights – orders, carts, wishlist, and contact activity
            </p>
          </div>
        </div>
      </div>

      <DateRangeFilter value={range} onChange={setRange} />

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="Total orders"
          value={loading || !summary ? "--" : summary.totalOrders}
          accent="blue"
          subtitle="Within selected period"
        />
        <StatsCard
          title="Total products"
          value={loading || !summary ? "--" : summary.totalProducts}
          accent="green"
          subtitle="Added in this period"
        />
        <StatsCard
          title="Cart items"
          value={loading || !summary ? "--" : summary.totalCartItems}
          accent="yellow"
          subtitle="Cart activity"
        />
        <StatsCard
          title="Wishlist items"
          value={loading || !summary ? "--" : summary.totalWishlistItems}
          accent="blue"
          subtitle="Wishlist activity"
        />
        <StatsCard
          title="Contact submissions"
          value={loading || !summary ? "--" : summary.totalContacts}
          accent="red"
          subtitle="Support & inquiries"
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Time series
        </h2>
        <div className="min-h-[260px] w-full">
          <DashboardBarChart data={data?.series ?? []} />
        </div>
      </section>
    </div>
  );
}
