"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Undo2 } from "lucide-react";

import api from "@/lib/api";
import { usePageLoadingBar } from "@/hooks/usePageLoadingBar";
import { useBranding } from "@/context/BrandingContext";
import { useFeatures } from "@/hooks/useFeatures";
import { useRefreshCountdown } from "@/hooks/useRefreshCountdown";
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
import type {
  DevicesData,
  DeltaMode,
  OverviewData,
  PageRow,
  PageviewsComparison,
  PageviewsPoint,
  ParcelsData,
  ProductRow,
  RangeOption,
  RevenueComparison,
  UTMData,
} from "./_components/types";

export default function AnalyticsPage() {
  const router = useRouter();
  const locale = useLocale();
  const tCommon = useTranslations("common");
  const tPages = useTranslations("pages");
  const { currencySymbol } = useBranding();
  const [range, setRange] = useState<RangeOption>("30");
  const [deltaMode, setDeltaMode] = useState<DeltaMode>("mom");
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [cachedAt, setCachedAt] = useState<number>(() => Date.now() / 1000);
  const [ttlSeconds, setTtlSeconds] = useState<number>(300);
  const [pageviewsData, setPageviewsData] = useState<PageviewsComparison | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueComparison | null>(null);
  const [pagesData, setPagesData] = useState<PageRow[]>([]);
  const [productsData, setProductsData] = useState<ProductRow[]>([]);
  const [parcelsData, setParcelsData] = useState<ParcelsData | null>(null);
  const [devicesData, setDevicesData] = useState<{ device: string; sessions: number }[]>([]);
  const [utmData, setUtmData] = useState<UTMData | null>(null);
  const [utmDimension, setUtmDimension] = useState<"source" | "medium" | "campaign">("source");
  const [utmLoading, setUtmLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const { hasFeature, loading: featuresLoading } = useFeatures();
  usePageLoadingBar(featuresLoading || loading);
  const hasAdvancedAnalytics = hasFeature("advanced_analytics");

  const mainGenRef = useRef(0);
  const utmGenRef = useRef(0);

  const RANGE_OPTIONS: { value: RangeOption; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "7", label: "7d" },
    { value: "15", label: "15d" },
    { value: "30", label: "30d" },
  ];

  const loadMainAnalytics = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      const gen = ++mainGenRef.current;
      if (!silent) setLoading(true);
      try {
        type OverviewApiResponse = OverviewData & {
          cached_at?: number;
          cache_ttl_seconds?: number;
        };
        const [o, pv, rev, pages, prods, parcels, devices] = await Promise.all([
          api.get<OverviewApiResponse>(`admin/analytics/overview/?range=${range}`),
          api.get<{
            data: PageviewsPoint[];
            comparison: PageviewsPoint[];
            summary: {
              current_pageviews: number;
              previous_pageviews: number;
              pageviews_pct_change: number | null;
              current_sessions: number;
              previous_sessions: number;
              sessions_pct_change: number | null;
            };
          }>(`admin/analytics/pageviews/?range=${range}`),
          api.get<{
            data: { date: string; revenue: string; orders: number; aov: string }[];
            comparison: { date: string; revenue: string; orders: number; aov: string }[];
            summary: {
              current_revenue: string;
              previous_revenue: string;
              pct_change: number | null;
            };
          }>(`admin/analytics/revenue/?range=${range}`),
          api.get<{ data: PageRow[] }>(`admin/analytics/pages/?range=${range}`),
          api.get<{ data: { product_id: string; product_name: string; views: number; add_to_cart: number; purchases: number; revenue: string; conversion_rate: number }[] }>(
            `admin/analytics/products/?range=${range}`
          ),
          api.get<ParcelsData>(`admin/analytics/parcels/?range=${range}`),
          api.get<DevicesData>(`admin/analytics/devices/?range=${range}`),
        ]);
        if (gen !== mainGenRef.current) return;
        setOverview(o.data);
        setCachedAt(typeof o.data.cached_at === "number" ? o.data.cached_at : Date.now() / 1000);
        setTtlSeconds(
          typeof o.data.cache_ttl_seconds === "number" ? o.data.cache_ttl_seconds : 300
        );
        setPageviewsData({
          data: Array.isArray(pv.data.data) ? pv.data.data : [],
          comparison: Array.isArray(pv.data.comparison) ? pv.data.comparison : [],
          summary: {
            current_pageviews: pv.data.summary?.current_pageviews ?? 0,
            previous_pageviews: pv.data.summary?.previous_pageviews ?? 0,
            pageviews_pct_change: pv.data.summary?.pageviews_pct_change ?? null,
            current_sessions: pv.data.summary?.current_sessions ?? 0,
            previous_sessions: pv.data.summary?.previous_sessions ?? 0,
            sessions_pct_change: pv.data.summary?.sessions_pct_change ?? null,
          },
        });
        setRevenueData({
          data: (rev.data.data ?? []).map((r) => ({
            date: r.date,
            revenue: Number(r.revenue || 0),
            orders: Number(r.orders || 0),
            aov: Number(r.aov || 0),
          })),
          comparison: (rev.data.comparison ?? []).map((r) => ({
            date: r.date,
            revenue: Number(r.revenue || 0),
            orders: Number(r.orders || 0),
            aov: Number(r.aov || 0),
          })),
          summary: {
            current_revenue: rev.data.summary?.current_revenue ?? "0",
            previous_revenue: rev.data.summary?.previous_revenue ?? "0",
            pct_change: rev.data.summary?.pct_change ?? null,
          },
        });
        setPagesData(Array.isArray(pages.data.data) ? pages.data.data : []);
        setProductsData(
          (Array.isArray(prods.data.data) ? prods.data.data : []).map((p) => ({
            product_id: String(p.product_id || ""),
            product_name: String(p.product_name || ""),
            views: Number(p.views || 0),
            add_to_cart: Number(p.add_to_cart || 0),
            purchases: Number(p.purchases || 0),
            revenue: Number(p.revenue || 0),
            conversion_rate: Number(p.conversion_rate || 0),
          }))
        );
        setParcelsData(parcels.data);
        setDevicesData(Array.isArray(devices.data.data) ? devices.data.data : []);
      } catch (err) {
        notify.error(err, {
          title: { key: "pages.toastTitleAnalyticsFailedToLoad" },
          fallbackMessage: { key: "pages.toastDescAnalyticsFailedToLoad" },
          action: {
            label: tCommon("toastActionRetry"),
            onClick: () => window.location.reload(),
          },
        });
      } finally {
        if (gen === mainGenRef.current && !silent) setLoading(false);
      }
    },
    [range]
  );

  const loadUtm = useCallback(async () => {
    const gen = ++utmGenRef.current;
    setUtmLoading(true);
    try {
      const res = await api.get<UTMData>(
        `admin/analytics/utm/?range=${range}&dimension=${utmDimension}`
      );
      if (gen !== utmGenRef.current) return;
      setUtmData(res.data);
    } catch (err) {
      notify.error(err, {
        title: { key: "pages.toastTitleUtmBreakdownUnavailable" },
        fallbackMessage: { key: "pages.toastDescUtmBreakdownUnavailable" },
      });
    } finally {
      if (gen === utmGenRef.current) setUtmLoading(false);
    }
  }, [range, utmDimension]);

  const handleCountdownExpire = useCallback(async () => {
    await Promise.all([loadMainAnalytics({ silent: true }), loadUtm()]);
  }, [loadMainAnalytics, loadUtm]);

  const { secondsLeft, isRefreshing } = useRefreshCountdown({
    cachedAt,
    ttlSeconds,
    enabled: hasAdvancedAnalytics && !featuresLoading && !loading,
    onExpire: handleCountdownExpire,
  });

  useEffect(() => {
    if (!hasAdvancedAnalytics) return;
    void loadMainAnalytics({ silent: false });
  }, [hasAdvancedAnalytics, range, loadMainAnalytics]);

  useEffect(() => {
    if (!hasAdvancedAnalytics) return;
    void loadUtm();
  }, [utmDimension, hasAdvancedAnalytics, range, loadUtm]);

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
