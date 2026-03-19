"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { History } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import DashboardBarChart from "@/components/DashboardBarChart";
import DateRangeFilter, {
  DateRangeValue,
} from "@/components/DateRangeFilter";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";
import { useActivities } from "@/hooks/useActivities";
import NotificationDropdown from "@/components/NotificationDropdown";
import { Button } from "@/components/ui/button";

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => n.toString().padStart(2, "0");
  const datePart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const timePart = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `${datePart}, ${timePart}`;
}

export default function DashboardPage() {
  const today = useMemo(() => new Date(), []);

  const [range, setRange] = useState<DateRangeValue>(() => {
    const end = today;
    const start = end;
    const iso = format(start, "yyyy-MM-dd");
    return {
      startDate: iso,
      endDate: iso,
      bucket: "day",
      preset: "today",
    };
  });

  const { data, loading, error } = useDashboardAnalytics({
    startDate: range.startDate,
    endDate: range.endDate,
    bucket: range.bucket,
  });

  const summary = data?.summary;
  const activitiesFilters = useMemo(
    () => ({
      page: 1,
    }),
    [],
  );
  const {
    data: activitiesData,
    loading: activitiesLoading,
    error: activitiesError,
  } = useActivities(activitiesFilters);
  const recentActivities = activitiesData?.results.slice(0, 5) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="order-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Dashboard overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            High-level snapshot of orders, products, carts, wishlist and contact
            activity. On mobile, see your most recent admin activities.
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <NotificationDropdown />
          <Link href="/activities">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Activities"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <History className="size-5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Desktop: inline filters */}
      <div className="order-3 hidden space-y-3 md:order-1 md:block">
        <DateRangeFilter value={range} onChange={setRange} />

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Mobile: recent activities instead of stats cards */}
      <section className="order-1 md:hidden">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          Recent activities
        </h2>
        {activitiesLoading ? (
          <div className="flex h-24 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : activitiesError ? (
          <p className="text-xs text-destructive">{activitiesError}</p>
        ) : recentActivities.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No recent admin activity yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-dashed border-border bg-background">
            <div className="overflow-x-auto">
              <div className="min-w-max divide-y divide-border">
                {recentActivities.map((item) => (
                  <div key={item.id} className="px-4 py-2.5 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground whitespace-nowrap">
                          {item.summary}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          <div className="flex flex-nowrap items-center gap-2">
                            <span className="uppercase tracking-wide">
                              {item.action}
                            </span>
                            <span>·</span>
                            <span>
                              {item.entity_type}
                              {item.entity_id ? ` #${item.entity_id}` : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-[10px] text-muted-foreground whitespace-nowrap text-right">
                        {formatDateTime(item.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Desktop: stats cards */}
      <section className="order-2 hidden grid-cols-2 gap-4 md:order-2 md:grid md:grid-cols-3 xl:grid-cols-5">
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

      <section className="order-1 md:order-3">
        {/* Chart: hidden on small screens, visible from md and up */}
        <div className="hidden w-full min-h-[260px] md:grid gap-4 lg:grid-cols-[minmax(0,2fr)]">
          <DashboardBarChart data={data?.series ?? []} />
        </div>
      </section>
    </div>
  );
}
