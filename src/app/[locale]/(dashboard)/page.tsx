"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import StatsCard from "@/components/StatsCard";
import DashboardBarChart from "@/components/DashboardBarChart";
import DateRangeFilter, {
  DateRangeValue,
} from "@/components/DateRangeFilter";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";
import { useActivities } from "@/hooks/useActivities";
import { toLocaleDigits } from "@/lib/locale-digits";
import { numberTextClass } from "@/lib/number-font";
import { formatDashboardDateTimeWithSeconds } from "@/lib/datetime-display";
import { todayYmdInBD } from "@/utils/time";

export default function DashboardPage() {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const t = useTranslations("dashboard");
  const today = useMemo(() => new Date(), []);

  const [range, setRange] = useState<DateRangeValue>(() => {
    const iso = todayYmdInBD(today);
    return {
      startDate: iso,
      endDate: iso,
      bucket: "day",
      preset: "today",
    };
  });

  const { data, loading, error, networkError: analyticsNetworkError } = useDashboardAnalytics({
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
    networkError: activitiesNetworkError,
  } = useActivities(activitiesFilters);
  const recentActivities = activitiesData?.results.slice(0, 5) ?? [];

  const fmtStat = (n: number | undefined) =>
    n == null ? "--" : toLocaleDigits(String(n), locale);

  return (
    <div className="flex flex-col gap-6">
      <header className="order-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-medium leading-relaxed tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground md:hidden">
            {t("subtitle")}
          </p>
        </div>
      </header>

      <p className="order-0 hidden text-sm leading-relaxed text-muted-foreground md:block">
        {t("subtitle")}
      </p>

      <div className="order-3 hidden space-y-3 md:order-1 md:block">
        <DateRangeFilter value={range} onChange={setRange} />

        {(error || analyticsNetworkError) && (
          <div className="rounded-card border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm leading-relaxed text-destructive">
            {analyticsNetworkError ? t("serverUnreachable") : error}
          </div>
        )}
      </div>

      <section className="order-1 md:hidden">
        <h2 className="mb-2 text-sm font-semibold leading-relaxed text-foreground">
          {t("recentActivities")}
        </h2>
        {activitiesLoading ? (
          <div className="flex h-24 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : activitiesError || activitiesNetworkError ? (
          <p className="text-xs text-destructive">
            {activitiesNetworkError ? t("serverUnreachable") : activitiesError}
          </p>
        ) : recentActivities.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("noRecentActivity")}
          </p>
        ) : (
          <div className="overflow-hidden rounded-card border border-dashed border-border bg-background">
            <div className="overflow-x-auto">
              <div className="min-w-max divide-y divide-border">
                {recentActivities.map((item) => (
                  <div key={item.public_id} className="px-4 py-2.5 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium whitespace-nowrap text-foreground">
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
                              {item.entity_id ? (
                                <>
                                  {" #"}
                                  <span className={numClass}>
                                    {toLocaleDigits(String(item.entity_id), locale)}
                                  </span>
                                </>
                              ) : null}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 whitespace-nowrap text-right text-[10px] text-muted-foreground">
                        {formatDashboardDateTimeWithSeconds(
                          item.created_at,
                          locale
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="order-2 hidden grid-cols-2 gap-4 md:order-2 md:grid md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("totalOrders")}
          value={loading || !summary ? "--" : fmtStat(summary.totalOrders)}
          accent="blue"
          subtitle={t("withinPeriod")}
          numberFont={locale === "bn" ? "sans" : "mono"}
        />
        <StatsCard
          title={t("totalProducts")}
          value={loading || !summary ? "--" : fmtStat(summary.totalProducts)}
          accent="green"
          subtitle={t("addedInPeriod")}
          numberFont={locale === "bn" ? "sans" : "mono"}
        />
        <StatsCard
          title={t("totalCustomers")}
          value={
            loading || !summary ? "--" : fmtStat(summary.totalCustomers)
          }
          accent="yellow"
          subtitle={t("customersInPeriod")}
          numberFont={locale === "bn" ? "sans" : "mono"}
        />
        <StatsCard
          title={t("supportTickets")}
          value={
            loading || !summary ? "--" : fmtStat(summary.totalSupportTickets)
          }
          accent="red"
          subtitle={t("supportAndInquiries")}
          numberFont={locale === "bn" ? "sans" : "mono"}
        />
      </section>

      <section className="order-1 md:order-3">
        <div className="hidden w-full min-h-[260px] gap-4 md:grid lg:grid-cols-[minmax(0,2fr)]">
          <DashboardBarChart data={data?.series ?? []} />
        </div>
      </section>
    </div>
  );
}
