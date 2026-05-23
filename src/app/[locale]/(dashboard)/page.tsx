"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import DashboardHero from "@/components/dashboard/DashboardHero";
import DashboardKpiCard from "@/components/dashboard/DashboardKpiCard";
import DashboardActivityTimeline from "@/components/dashboard/DashboardActivityTimeline";
import DashboardComingSoonCard from "@/components/dashboard/DashboardComingSoonCard";
import DashboardStatusFooter from "@/components/dashboard/DashboardStatusFooter";
import type { DateRangeValue } from "@/components/DateRangeFilter";
import { useDashboardAnalyticsQuery } from "@/hooks/useDashboardAnalyticsQuery";
import { useNavCounts } from "@/hooks/useNavCounts";
import { useBrandingQuery } from "@/hooks/useBrandingQuery";
import { useDashboardRefresh } from "@/context/DashboardRefreshContext";
import { computeTrend } from "@/lib/dashboard/compute-trend";
import { getPreviousDateRange } from "@/lib/dashboard/previous-date-range";
import { toLocaleDigits } from "@/lib/locale-digits";
import { todayYmdInBD } from "@/utils/time";

function formatLastUpdated(lastRefreshedAt: Date | null, now: number): string | null {
  if (!lastRefreshedAt) return null;
  const seconds = Math.floor((now - lastRefreshedAt.getTime()) / 1000);
  if (seconds < 30) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function DashboardPage() {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const { data: branding } = useBrandingQuery();
  const { lastRefreshedAt } = useDashboardRefresh();
  const today = useMemo(() => new Date(), []);
  const [now, setNow] = useState(() => Date.now());

  const [range, setRange] = useState<DateRangeValue>(() => {
    const iso = todayYmdInBD(today);
    return {
      startDate: iso,
      endDate: iso,
      bucket: "hour",
      preset: "today",
    };
  });

  const previousRange = useMemo(() => getPreviousDateRange(range), [range]);

  const accountName =
    branding?.owner_name?.trim() || branding?.admin_name?.trim() || "there";

  const greeting = useMemo(() => {
    const hourLocal = new Date().getHours();
    if (hourLocal >= 5 && hourLocal < 12) return t("greetingMorning");
    if (hourLocal >= 12 && hourLocal < 17) return t("greetingAfternoon");
    if (hourLocal >= 17 && hourLocal < 23) return t("greetingEvening");
    return t("greetingLateNight");
  }, [t]);

  const {
    data,
    isLoading,
    error,
    networkError: analyticsNetworkError,
  } = useDashboardAnalyticsQuery({
    startDate: range.startDate,
    endDate: range.endDate,
    bucket: range.bucket,
  });

  const { data: previousData } = useDashboardAnalyticsQuery({
    startDate: previousRange.startDate,
    endDate: previousRange.endDate,
    bucket: previousRange.bucket,
  });

  const { isError: navCountsError } = useNavCounts();

  const summary = data?.summary;
  const previousSummary = previousData?.summary;
  const series = data?.series ?? [];
  const numberFont = locale === "bn" ? "sans" : "mono";

  const fmtStat = (n: number | undefined) =>
    n == null ? "--" : toLocaleDigits(String(n), locale);

  const kpiTrend = (
    current: number | undefined,
    previous: number | undefined
  ) => {
    if (current == null || previous == null) return undefined;
    return computeTrend(current, previous);
  };

  const lastUpdatedLabel = formatLastUpdated(lastRefreshedAt, now);
  const apiHealthy = !analyticsNetworkError && !navCountsError && !error;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-6 pb-2">
      <DashboardHero
        greeting={greeting}
        accountName={accountName}
        lastUpdatedLabel={lastUpdatedLabel}
        range={range}
        onRangeChange={setRange}
      />

      {(error || analyticsNetworkError) && (
        <div className="rounded-card border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {analyticsNetworkError ? t("serverUnreachable") : error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <DashboardKpiCard
          title={t("totalOrders")}
          value={!summary ? "--" : fmtStat(summary.totalOrders)}
          subtitle={t("withinPeriod")}
          accent="blue"
          trend={kpiTrend(summary?.totalOrders, previousSummary?.totalOrders)}
          numberFont={numberFont}
          loading={isLoading}
        />
        <DashboardKpiCard
          title={t("totalProducts")}
          value={!summary ? "--" : fmtStat(summary.totalProducts)}
          subtitle={t("addedInPeriod")}
          accent="green"
          trend={kpiTrend(summary?.totalProducts, previousSummary?.totalProducts)}
          numberFont={numberFont}
          loading={isLoading}
        />
        <DashboardKpiCard
          title={t("totalCustomers")}
          value={!summary ? "--" : fmtStat(summary.totalCustomers)}
          subtitle={t("customersInPeriod")}
          accent="yellow"
          trend={kpiTrend(summary?.totalCustomers, previousSummary?.totalCustomers)}
          numberFont={numberFont}
          loading={isLoading}
        />
        <DashboardKpiCard
          title={t("supportTickets")}
          value={!summary ? "--" : fmtStat(summary.totalSupportTickets)}
          subtitle={t("supportAndInquiries")}
          accent="red"
          trend={kpiTrend(
            summary?.totalSupportTickets,
            previousSummary?.totalSupportTickets
          )}
          numberFont={numberFont}
          loading={isLoading}
        />
      </section>

      <DashboardActivityTimeline data={series} bucket={range.bucket} />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <DashboardComingSoonCard className="aspect-square w-full py-6 sm:py-8" minHeightClass="min-h-0" />
        <DashboardComingSoonCard className="aspect-square w-full py-6 sm:py-8" minHeightClass="min-h-0" />
        <DashboardComingSoonCard className="aspect-square w-full py-6 sm:py-8" minHeightClass="min-h-0" />
        <DashboardComingSoonCard className="aspect-square w-full py-6 sm:py-8" minHeightClass="min-h-0" />
      </section>

      <DashboardStatusFooter apiHealthy={apiHealthy} latencyMs={null} />
    </div>
  );
}
