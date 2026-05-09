"use client";

import {
  Activity,
  Clock,
  MousePointerClick,
  Package,
  PackageOpen,
  Percent,
  Truck,
  Wallet,
} from "lucide-react";

import type { DeltaMode, OverviewData } from "./types";
import { MetricCard } from "./MetricCard";

export function OverviewMetricGrids({
  overview,
  deltaMode,
  currencySymbol,
}: {
  overview: OverviewData | null;
  deltaMode: DeltaMode;
  currencySymbol: string;
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          metricKey="pageviews"
          title="Pageviews"
          value={String(overview?.pageviews.value ?? 0)}
          mom={overview?.pageviews.mom ?? null}
          yoy={overview?.pageviews.yoy ?? null}
          deltaMode={deltaMode}
          icon={MousePointerClick}
        />
        <MetricCard
          metricKey="sessions"
          title="Sessions"
          value={String(overview?.sessions.value ?? 0)}
          mom={overview?.sessions.mom ?? null}
          yoy={overview?.sessions.yoy ?? null}
          deltaMode={deltaMode}
          icon={Activity}
        />
        <MetricCard
          metricKey="bounce_rate"
          title="Bounce Rate"
          value={`${(overview?.bounce_rate.value ?? 0).toFixed(1)}%`}
          mom={overview?.bounce_rate.mom ?? null}
          yoy={overview?.bounce_rate.yoy ?? null}
          deltaMode={deltaMode}
          icon={Percent}
        />
        <MetricCard
          metricKey="avg_session_duration"
          title="Avg Session Duration"
          value={`${Math.round(overview?.avg_session_duration.value ?? 0)}s`}
          mom={overview?.avg_session_duration.mom ?? null}
          yoy={overview?.avg_session_duration.yoy ?? null}
          deltaMode={deltaMode}
          icon={Clock}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          metricKey="revenue"
          title="Revenue"
          value={`${currencySymbol}${Number(overview?.revenue.value ?? 0).toLocaleString()}`}
          mom={overview?.revenue.mom ?? null}
          yoy={overview?.revenue.yoy ?? null}
          deltaMode={deltaMode}
          icon={Wallet}
        />
        <MetricCard
          metricKey="orders"
          title="Orders"
          value={String(overview?.orders.value ?? 0)}
          mom={overview?.orders.mom ?? null}
          yoy={overview?.orders.yoy ?? null}
          deltaMode={deltaMode}
          icon={PackageOpen}
        />
        <MetricCard
          metricKey="aov"
          title="AOV"
          value={`${currencySymbol}${Number(overview?.aov.value ?? 0).toLocaleString()}`}
          mom={overview?.aov.mom ?? null}
          yoy={overview?.aov.yoy ?? null}
          deltaMode={deltaMode}
          icon={Package}
        />
        <MetricCard
          metricKey="return_rate"
          title="Return Rate"
          value={`${(overview?.return_rate.value ?? 0).toFixed(1)}%`}
          mom={overview?.return_rate.mom ?? null}
          yoy={overview?.return_rate.yoy ?? null}
          deltaMode={deltaMode}
          icon={Truck}
        />
      </div>
    </>
  );
}
