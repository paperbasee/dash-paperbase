"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Undo2 } from "lucide-react";

import { useBranding } from "@/context/BrandingContext";
import { useFeatures } from "@/hooks/useFeatures";
import { useRefreshCountdown } from "@/hooks/useRefreshCountdown";
import { useAnalyticsOverviewQuery } from "@/hooks/useAnalyticsOverviewQuery";
import { useAnalyticsPageviewsQuery } from "@/hooks/useAnalyticsPageviewsQuery";
import { useAnalyticsRevenueQuery } from "@/hooks/useAnalyticsRevenueQuery";
import { useAnalyticsPagesQuery } from "@/hooks/useAnalyticsPagesQuery";
import { useAnalyticsProductsQuery } from "@/hooks/useAnalyticsProductsQuery";
import { useAnalyticsParcelsQuery } from "@/hooks/useAnalyticsParcelsQuery";
import { useAnalyticsDevicesQuery } from "@/hooks/useAnalyticsDevicesQuery";
import { useAnalyticsUtmQuery } from "@/hooks/useAnalyticsUtmQuery";
import { advancedAnalyticsQueryKeyRoot } from "@/lib/query-keys";
import { useRouter } from "@/i18n/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocale, useTranslations } from "next-intl";
import { notify } from "@/notifications";

import { AnalyticsUpgradeWall } from "./_components/AnalyticsUpgradeWall";
import { DeviceBreakdownCard } from "./_components/DeviceBreakdownCard";
import { OverviewMetricGrids } from "./_components/OverviewMetricGrids";
import { PageviewsSessionsChart } from "./_components/PageviewsSessionsChart";
import { ParcelStatusCard } from "./_components/ParcelStatusCard";
import { RevenueChartCard } from "./_components/RevenueChartCard";
import { TopPagesTable } from "./_components/TopPagesTable";
import { TopProductsTable } from "./_components/TopProductsTable";
import { TrafficAcquisitionSection } from "./_components/TrafficAcquisitionSection";
import { metricAllZero } from "./_components/format";
import type { DeltaMode, RangeOption } from "./_components/types";

export default function AnalyticsPage() {
  const router = useRouter();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const tCommon = useTranslations("common");
  const { currencySymbol } = useBranding();
  const [range, setRange] = useState<RangeOption>("30");
  const [deltaMode, setDeltaMode] = useState<DeltaMode>("mom");
  const [utmDimension, setUtmDimension] = useState<"source" | "medium" | "campaign">("source");
  const { hasFeature, loading: featuresLoading } = useFeatures();
  const hasAdvancedAnalytics = hasFeature("advanced_analytics");

  const queryEnabled = hasAdvancedAnalytics && !featuresLoading;

  const overviewQuery = useAnalyticsOverviewQuery(range, { enabled: queryEnabled });
  const staleTimeMs = useMemo(
    () => (overviewQuery.data?.cacheTtlSeconds ?? 300) * 1000,
    [overviewQuery.data?.cacheTtlSeconds]
  );
  const queryOptions = useMemo(
    () => ({ enabled: queryEnabled, staleTime: staleTimeMs }),
    [queryEnabled, staleTimeMs]
  );

  const pageviewsQuery = useAnalyticsPageviewsQuery(range, queryOptions);
  const revenueQuery = useAnalyticsRevenueQuery(range, queryOptions);
  const pagesQuery = useAnalyticsPagesQuery(range, queryOptions);
  const productsQuery = useAnalyticsProductsQuery(range, queryOptions);
  const parcelsQuery = useAnalyticsParcelsQuery(range, queryOptions);
  const devicesQuery = useAnalyticsDevicesQuery(range, queryOptions);
  const utmQuery = useAnalyticsUtmQuery(range, utmDimension, queryOptions);

  const overview = overviewQuery.data?.overview ?? null;
  const cachedAt = overviewQuery.data?.cachedAt ?? Date.now() / 1000;
  const ttlSeconds = overviewQuery.data?.cacheTtlSeconds ?? 300;
  const pageviewsData = pageviewsQuery.data ?? null;
  const revenueData = revenueQuery.data ?? null;
  const pagesData = pagesQuery.data ?? [];
  const productsData = productsQuery.data ?? [];
  const parcelsData = parcelsQuery.data ?? null;
  const devicesData = devicesQuery.data ?? [];
  const utmData = utmQuery.data ?? null;

  const mainQueries = [
    overviewQuery,
    pageviewsQuery,
    revenueQuery,
    pagesQuery,
    productsQuery,
    parcelsQuery,
    devicesQuery,
  ];
  const loading = mainQueries.some((q) => q.isLoading);
  const utmLoading = utmQuery.isFetching;

  const mainBatchError = mainQueries.find((q) => q.isError)?.error;
  useEffect(() => {
    if (!mainBatchError) return;
    notify.error(mainBatchError, {
      title: { key: "pages.toastTitleAnalyticsFailedToLoad" },
      fallbackMessage: { key: "pages.toastDescAnalyticsFailedToLoad" },
      action: {
        label: tCommon("toastActionRetry"),
        onClick: () => window.location.reload(),
      },
    });
  }, [mainBatchError, tCommon]);

  useEffect(() => {
    if (!utmQuery.isError || !utmQuery.error) return;
    notify.error(utmQuery.error, {
      title: { key: "pages.toastTitleUtmBreakdownUnavailable" },
      fallbackMessage: { key: "pages.toastDescUtmBreakdownUnavailable" },
    });
  }, [utmQuery.isError, utmQuery.error]);

  const handleCountdownExpire = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: advancedAnalyticsQueryKeyRoot });
  }, [queryClient]);

  const { secondsLeft, isRefreshing } = useRefreshCountdown({
    cachedAt,
    ttlSeconds,
    enabled: hasAdvancedAnalytics && !featuresLoading && !loading,
    onExpire: handleCountdownExpire,
  });

  const RANGE_OPTIONS: { value: RangeOption; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "7", label: "7d" },
    { value: "15", label: "15d" },
    { value: "30", label: "30d" },
  ];

  if (featuresLoading) {
    return null;
  }

  if (!hasAdvancedAnalytics) {
    return <AnalyticsUpgradeWall />;
  }

  if (loading) {
    return null;
  }

  if (metricAllZero(overview)) {
    return (
      <div className="rounded-card border border-card-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">
          No analytics data yet. Make sure the Paperbase tracker is installed on your storefront.
        </p>
      </div>
    );
  }

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const mmStr = String(mm).padStart(2, "0");
  const ssStr = String(ss).padStart(2, "0");
  const countdownLabel = `${mmStr}:${ssStr}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="rounded-card bg-muted/80 px-1 py-1 hidden md:block">
              <button
                type="button"
                onClick={() => router.back()}
                aria-label="Go back"
                className="flex items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
              >
                <Undo2 className="h-4 w-4" />
              </button>
            </div>
            <h1 className="text-2xl font-medium leading-relaxed text-foreground">Analytics</h1>
          </div>
          <div className="flex items-stretch gap-2 flex-wrap">
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <div
                  role="status"
                  aria-live="polite"
                  aria-label={
                    isRefreshing
                      ? "Refreshing analytics data"
                      : `Page automatically refreshes in ${countdownLabel}`
                  }
                  tabIndex={0}
                  className="flex min-h-0 shrink-0 items-center gap-1 rounded-ui border border-border bg-muted/70 p-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <span
                    className={`rounded-ui px-3 py-1.5 font-medium tabular-nums leading-none ${
                      isRefreshing ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {isRefreshing ? "Refreshing…" : `${mmStr}:${ssStr}`}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} variant="light">
                <p lang={locale === "bn" ? "bn" : "en"} className="leading-relaxed text-balance">
                  {isRefreshing
                    ? "Refreshing analytics data"
                    : `Page automatically refreshes in ${countdownLabel}`}
                </p>
              </TooltipContent>
            </Tooltip>
            <div className="flex min-h-0 items-center gap-1 rounded-ui border border-border bg-muted/70 p-1 text-sm shadow-xs">
              <button
                type="button"
                onClick={() => setDeltaMode("mom")}
                className={`rounded-ui px-3 py-1.5 font-medium transition ${
                  deltaMode === "mom"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                }`}
              >
                MoM
              </button>
              <button
                type="button"
                onClick={() => setDeltaMode("yoy")}
                className={`rounded-ui px-3 py-1.5 font-medium transition ${
                  deltaMode === "yoy"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                }`}
              >
                YoY
              </button>
            </div>
            <div className="flex min-h-0 items-center gap-1 rounded-ui border border-border bg-muted/70 p-1 text-sm shadow-xs">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRange(opt.value)}
                  className={`rounded-ui px-3 py-1.5 font-medium transition ${
                    range === opt.value
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

      <OverviewMetricGrids overview={overview} deltaMode={deltaMode} currencySymbol={currencySymbol} />

      <PageviewsSessionsChart pageviewsData={pageviewsData} range={range} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:items-stretch">
        <RevenueChartCard revenueData={revenueData} range={range} currencySymbol={currencySymbol} />
        <DeviceBreakdownCard devicesData={devicesData} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <TopPagesTable pagesData={pagesData} />
        <ParcelStatusCard parcelsData={parcelsData} />
      </div>

      <TopProductsTable productsData={productsData} currencySymbol={currencySymbol} />

      <TrafficAcquisitionSection
        utmData={utmData}
        utmLoading={utmLoading}
        utmDimension={utmDimension}
        onUtmDimensionChange={setUtmDimension}
        range={range}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}
