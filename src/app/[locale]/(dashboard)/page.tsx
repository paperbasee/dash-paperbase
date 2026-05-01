"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import StatsCard from "@/components/StatsCard";
import DashboardBarChart from "@/components/DashboardBarChart";
import DateRangeFilter, {
  DateRangeValue,
} from "@/components/DateRangeFilter";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";
import { useBrandingProfileSWR } from "@/hooks/useBrandingProfileSWR";
import { toLocaleDigits } from "@/lib/locale-digits";
import { todayYmdInBD } from "@/utils/time";

export default function DashboardPage() {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const { data: branding } = useBrandingProfileSWR();
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

  const accountName = branding?.owner_name?.trim() || branding?.admin_name?.trim() || "there";
  const greeting = useMemo(() => {
    const hourLocal = new Date().getHours();

    if (hourLocal >= 5 && hourLocal < 12) return t("greetingMorning");
    if (hourLocal >= 12 && hourLocal < 17) return t("greetingAfternoon");
    if (hourLocal >= 17 && hourLocal < 23) return t("greetingEvening");
    return t("greetingLateNight");
  }, [t]);

  const { data, loading, error, networkError: analyticsNetworkError } = useDashboardAnalytics({
    startDate: range.startDate,
    endDate: range.endDate,
    bucket: range.bucket,
  });

  const summary = data?.summary;

  const fmtStat = (n: number | undefined) =>
    n == null ? "--" : toLocaleDigits(String(n), locale);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-0">
        <header className="order-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[1.65rem] sm:text-[1.85rem] font-medium leading-relaxed tracking-tight text-foreground">
              {t("title", { greeting, name: accountName })}
            </h1>
            <p className="mt-0 text-sm leading-relaxed text-muted-foreground md:hidden">
              {t("subtitle")}
            </p>
          </div>
        </header>

        <p className="order-0 hidden text-sm leading-relaxed text-muted-foreground md:block">
          {t("subtitle")}
        </p>
      </div>

      <div className="order-1 space-y-3 md:order-1">
        <DateRangeFilter value={range} onChange={setRange} />

        {(error || analyticsNetworkError) && (
          <div className="rounded-card border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm leading-relaxed text-destructive">
            {analyticsNetworkError ? t("serverUnreachable") : error}
          </div>
        )}
      </div>

      <section className="order-2 grid grid-cols-2 gap-4 md:order-2 md:grid-cols-2 lg:grid-cols-4">
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

      <section className="order-3 hidden md:order-3 md:block">
        <div className="grid w-full min-h-[260px] gap-4 lg:grid-cols-[minmax(0,2fr)]">
          <DashboardBarChart data={data?.series ?? []} />
        </div>
      </section>
    </div>
  );
}
