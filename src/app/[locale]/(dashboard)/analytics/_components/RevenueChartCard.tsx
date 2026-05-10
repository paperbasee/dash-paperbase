"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { areaPrimary, axisTickFill, chartGridStroke } from "./constants";
import { formatChartAxisLabel } from "./format";
import type { RangeOption, RevenueComparison } from "./types";
import { RechartsSizedContainer } from "@/components/RechartsSizedContainer";

function comparisonLabel(range: RangeOption): string {
  switch (range) {
    case "today":
      return "vs yesterday";
    case "7":
      return "vs previous 7 days";
    case "15":
      return "vs previous 15 days";
    case "30":
      return "vs previous 30 days";
    default:
      return "vs previous period";
  }
}

interface RevenueChartCardProps {
  revenueData: RevenueComparison | null;
  range: RangeOption;
  currencySymbol: string;
}

type TooltipPayloadEntry = {
  dataKey?: string | number;
  value?: number | string;
};

function CustomRevenueTooltip({
  active,
  payload,
  label,
  currencySymbol,
  range,
  showComparison,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  currencySymbol: string;
  range: RangeOption;
  showComparison: boolean;
}) {
  if (!active || !payload?.length) return null;
  const cur =
    Number(payload.find((p) => String(p.dataKey) === "current")?.value ?? 0);

  if (!showComparison) {
    return (
      <div
        style={{
          background: "rgba(20,20,20,0.92)",
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 12,
          color: "#fff",
          minWidth: 160,
        }}
      >
        <p style={{ margin: "0 0 6px", color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
          {label != null ? formatChartAxisLabel(String(label), range) : ""}
        </p>
        <p style={{ margin: 0 }}>
          {currencySymbol}
          {Number(cur).toLocaleString()}
        </p>
      </div>
    );
  }

  const prev =
    Number(payload.find((p) => String(p.dataKey) === "previous")?.value ?? 0);
  const pct = prev > 0 ? (((cur - prev) / prev) * 100).toFixed(1) : null;
  const sign = pct !== null ? (Number(pct) >= 0 ? "↑" : "↓") : null;

  return (
    <div
      style={{
        background: "rgba(20,20,20,0.92)",
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: 12,
        color: "#fff",
        minWidth: 160,
      }}
    >
      <p style={{ margin: "0 0 6px", color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
        {label != null ? formatChartAxisLabel(String(label), range) : ""}
      </p>
      <p style={{ margin: "0 0 2px" }}>
        This period: {currencySymbol}
        {Number(cur).toLocaleString()}
      </p>
      <p style={{ margin: "0 0 6px", color: "rgba(255,255,255,0.6)" }}>
        Previous: {currencySymbol}
        {Number(prev).toLocaleString()}
      </p>
      {pct !== null && (
        <p
          style={{
            margin: 0,
            color: Number(pct) >= 0 ? "#5DCAA5" : "#F09595",
            fontWeight: 500,
          }}
        >
          {sign} {Math.abs(Number(pct))}% vs previous
        </p>
      )}
    </div>
  );
}

export function RevenueChartCard({ revenueData, range, currencySymbol }: RevenueChartCardProps) {
  const chartData = useMemo(
    () =>
      (revenueData?.data ?? []).map((point, i) => ({
        date: point.date,
        current: point.revenue,
        previous: revenueData?.comparison?.[i]?.revenue ?? 0,
      })),
    [revenueData]
  );

  const hasPreviousData = useMemo(
    () => (revenueData?.comparison ?? []).some((p) => p.revenue > 0),
    [revenueData]
  );

  const pct = revenueData?.summary.pct_change ?? null;

  return (
    <div className="flex h-auto min-h-0 flex-col rounded-card border border-card-border bg-card p-4 lg:col-span-3 lg:h-full">
      <div className="mb-4 shrink-0 text-sm font-medium text-foreground">Revenue over time</div>

      {revenueData === null ? (
        <div className="h-48 w-full animate-pulse rounded-card bg-muted" />
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xl font-semibold tabular-nums text-foreground">
              {currencySymbol}
              {Number(revenueData.summary.current_revenue || 0).toLocaleString()}
            </span>
            {hasPreviousData &&
              (pct !== null ? (
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium tabular-nums ${
                    pct >= 0
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-red-500/15 text-red-700 dark:text-red-400"
                  }`}
                >
                  {pct >= 0 ? "↑" : "↓"} {Math.abs(pct)}% vs prev period
                </span>
              ) : (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  — vs prev period
                </span>
              ))}
          </div>
          {hasPreviousData && (
            <p className="mb-3 text-xs text-muted-foreground">{comparisonLabel(range)}</p>
          )}

          <div className="mb-3 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-0 w-5 border-t-2 border-solid" style={{ borderColor: areaPrimary }} />
              <span>This period</span>
            </div>
            {hasPreviousData && (
              <div className="flex items-center gap-2">
                <div
                  className="h-0 w-5 border-t-2 border-dashed"
                  style={{ borderColor: chartGridStroke }}
                />
                <span>Previous period</span>
              </div>
            )}
          </div>

          <div className="flex w-full min-w-0 flex-col lg:flex-1 lg:min-h-0">
            <RechartsSizedContainer
              className="h-48 w-full md:h-72 lg:h-auto lg:min-h-72 lg:flex-1"
              style={{ minHeight: 192 }}
            >
              {({ width, height }) => (
                <ResponsiveContainer width={width} height={height} minWidth={0}>
                  <LineChart data={chartData} margin={{ top: 8, left: 0, right: 24, bottom: 8 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={chartGridStroke}
                      opacity={0.4}
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={24}
                      tick={{ fill: axisTickFill, fontSize: 11 }}
                      tickCount={5}
                      interval="preserveStartEnd"
                      tickFormatter={(v) => formatChartAxisLabel(String(v), range)}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fill: axisTickFill, fontSize: 11 }}
                      width={40}
                      tickFormatter={(value) => {
                        const n = Number(value);
                        if (n >= 1000) return `${currencySymbol}${(n / 1000).toFixed(0)}k`;
                        return `${currencySymbol}${n}`;
                      }}
                    />
                    <RechartsTooltip
                      content={(props) => (
                        <CustomRevenueTooltip
                          active={props.active}
                          payload={props.payload as unknown as TooltipPayloadEntry[] | undefined}
                          label={props.label !== undefined ? String(props.label) : undefined}
                          currencySymbol={currencySymbol}
                          range={range}
                          showComparison={hasPreviousData}
                        />
                      )}
                    />
                    <Line
                      type="monotone"
                      dataKey="current"
                      name="This period"
                      stroke={areaPrimary}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    {hasPreviousData && (
                      <Line
                        type="monotone"
                        dataKey="previous"
                        name="Previous period"
                        stroke={chartGridStroke}
                        strokeWidth={1.5}
                        strokeDasharray="5 4"
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </RechartsSizedContainer>
          </div>
        </>
      )}
    </div>
  );
}
