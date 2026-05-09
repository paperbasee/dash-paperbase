"use client";

import { useEffect, useState } from "react";
import { Undo2 } from "lucide-react";

import api from "@/lib/api";
import { DashboardTableSkeleton } from "@/components/skeletons/dashboard-skeletons";
import { useBranding } from "@/context/BrandingContext";
import { useFeatures } from "@/hooks/useFeatures";
import { useRouter } from "@/i18n/navigation";

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
  PageviewsPoint,
  ParcelsData,
  ProductRow,
  RangeOption,
  RevenuePoint,
  UTMData,
} from "./_components/types";

export default function AnalyticsPage() {
  const router = useRouter();
  const { currencySymbol } = useBranding();
  const [range, setRange] = useState<RangeOption>("30");
  const [deltaMode, setDeltaMode] = useState<DeltaMode>("mom");
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [pageviewsData, setPageviewsData] = useState<PageviewsPoint[]>([]);
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [pagesData, setPagesData] = useState<PageRow[]>([]);
  const [productsData, setProductsData] = useState<ProductRow[]>([]);
  const [parcelsData, setParcelsData] = useState<ParcelsData | null>(null);
  const [devicesData, setDevicesData] = useState<{ device: string; sessions: number }[]>([]);
  const [utmData, setUtmData] = useState<UTMData | null>(null);
  const [utmDimension, setUtmDimension] = useState<"source" | "medium" | "campaign">("source");
  const [utmLoading, setUtmLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const { hasFeature, loading: featuresLoading } = useFeatures();
  const hasAdvancedAnalytics = hasFeature("advanced_analytics");

  const RANGE_OPTIONS: { value: RangeOption; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "7", label: "7d" },
    { value: "15", label: "15d" },
    { value: "30", label: "30d" },
  ];

  useEffect(() => {
    if (!hasAdvancedAnalytics) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const [o, pv, rev, pages, prods, parcels, devices] = await Promise.all([
          api.get<OverviewData>(`admin/analytics/overview/?range=${range}`),
          api.get<{ data: PageviewsPoint[] }>(`admin/analytics/pageviews/?range=${range}`),
          api.get<{ data: { date: string; revenue: string; orders: number; aov: string }[] }>(
            `admin/analytics/revenue/?range=${range}`
          ),
          api.get<{ data: PageRow[] }>(`admin/analytics/pages/?range=${range}`),
          api.get<{ data: { product_id: string; product_name: string; views: number; add_to_cart: number; purchases: number; revenue: string; conversion_rate: number }[] }>(
            `admin/analytics/products/?range=${range}`
          ),
          api.get<ParcelsData>(`admin/analytics/parcels/?range=${range}`),
          api.get<DevicesData>(`admin/analytics/devices/?range=${range}`),
        ]);
        if (cancelled) return;
        setOverview(o.data);
        setPageviewsData(Array.isArray(pv.data.data) ? pv.data.data : []);
        setRevenueData(
          (Array.isArray(rev.data.data) ? rev.data.data : []).map((r) => ({
            date: r.date,
            revenue: Number(r.revenue || 0),
            orders: Number(r.orders || 0),
            aov: Number(r.aov || 0),
          }))
        );
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
        console.error(err);
        if (!cancelled) setLoading(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasAdvancedAnalytics, range]);

  useEffect(() => {
    if (!hasAdvancedAnalytics) return;
    setUtmLoading(true);
    api
      .get<UTMData>(`admin/analytics/utm/?range=${range}&dimension=${utmDimension}`)
      .then((res) => setUtmData(res.data))
      .catch((err) => console.error(err))
      .finally(() => setUtmLoading(false));
  }, [utmDimension, hasAdvancedAnalytics, range]);

  if (featuresLoading) {
    return (
      <div className="space-y-6">
        <DashboardTableSkeleton columns={4} rows={3} showHeader={true} showFilters={false} />
        <DashboardTableSkeleton columns={6} rows={6} showHeader={false} showFilters={false} />
      </div>
    );
  }

  if (!hasAdvancedAnalytics) {
    return <AnalyticsUpgradeWall />;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <DashboardTableSkeleton columns={4} rows={3} showHeader={true} showFilters={false} />
        <DashboardTableSkeleton columns={6} rows={6} showHeader={false} showFilters={false} />
      </div>
    );
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
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 rounded-ui border border-border bg-muted/70 p-1 text-sm shadow-xs">
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
          <div className="flex items-center gap-1 rounded-ui border border-border bg-muted/70 p-1 text-sm shadow-xs">
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

      <PageviewsSessionsChart data={pageviewsData} range={range} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:items-stretch">
        <RevenueChartCard data={revenueData} range={range} currencySymbol={currencySymbol} />
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
