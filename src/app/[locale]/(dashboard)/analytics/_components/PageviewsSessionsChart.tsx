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

import { areaPrimary, areaSecondary, axisTickFill, chartGridStroke } from "./constants";
import { formatChartAxisLabel } from "./format";
import type { PageviewsComparison, RangeOption } from "./types";
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

interface PageviewsSessionsChartProps {
  pageviewsData: PageviewsComparison | null;
  range: RangeOption;
}

type TooltipPayloadEntry = {
  dataKey?: string | number;
  value?: number | string;
};

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct !== null) {
    return (
      <span
        className={`rounded-md px-2 py-0.5 text-xs font-medium tabular-nums ${
          pct >= 0
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            : "bg-red-500/15 text-red-700 dark:text-red-400"
        }`}
      >
        {pct >= 0 ? "↑" : "↓"} {Math.abs(pct)}% vs prev period
      </span>
    );
  }
  return (
    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      — vs prev period
    </span>
  );
}

function CustomPageviewsTooltip({
  active,
  payload,
  label,
  range,
  showComparison,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  range: RangeOption;
  showComparison: boolean;
}) {
  if (!active || !payload?.length) return null;

  const num = (key: string) =>
    Number(payload.find((p) => String(p.dataKey) === key)?.value ?? 0);

  const pvc = num("pageviews_current");
  const pvp = num("pageviews_prev");
  const sc = num("sessions_current");
  const sp = num("sessions_prev");

  const pctRow = (cur: number, prev: number) => {
    if (prev <= 0) return null;
    const p = (((cur - prev) / prev) * 100).toFixed(1);
    const n = Number(p);
    const sign = n >= 0 ? "↑" : "↓";
    return (
      <p
        style={{
          margin: "4px 0 0",
          color: n >= 0 ? "#5DCAA5" : "#F09595",
          fontWeight: 500,
        }}
      >
        {sign} {Math.abs(n)}% vs previous
      </p>
    );
  };

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
        <p style={{ margin: "0 0 8px", color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
          {label != null ? formatChartAxisLabel(String(label), range) : ""}
        </p>
        <p style={{ margin: "0 0 4px" }}>Pageviews: {pvc.toLocaleString()}</p>
        <p style={{ margin: 0 }}>Sessions: {sc.toLocaleString()}</p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "rgba(20,20,20,0.92)",
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: 12,
        color: "#fff",
        minWidth: 180,
      }}
    >
      <p style={{ margin: "0 0 8px", color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
        {label != null ? formatChartAxisLabel(String(label), range) : ""}
      </p>
      <p style={{ margin: "0 0 4px", fontWeight: 500 }}>Pageviews</p>
      <p style={{ margin: "0 0 2px" }}>Current: {pvc.toLocaleString()}</p>
      <p style={{ margin: "0 0 4px", color: "rgba(255,255,255,0.6)" }}>
        Previous: {pvp.toLocaleString()}
      </p>
      {pctRow(pvc, pvp)}
      <p style={{ margin: "10px 0 4px", fontWeight: 500 }}>Sessions</p>
      <p style={{ margin: "0 0 2px" }}>Current: {sc.toLocaleString()}</p>
      <p style={{ margin: "0 0 4px", color: "rgba(255,255,255,0.6)" }}>
        Previous: {sp.toLocaleString()}
      </p>
      {pctRow(sc, sp)}
    </div>
  );
}

export function PageviewsSessionsChart({ pageviewsData, range }: PageviewsSessionsChartProps) {
  const chartData = useMemo(
    () =>
      (pageviewsData?.data ?? []).map((point, i) => ({
        date: point.date,
        pageviews_current: point.pageviews,
        sessions_current: point.sessions,
        pageviews_prev: pageviewsData?.comparison?.[i]?.pageviews ?? 0,
        sessions_prev: pageviewsData?.comparison?.[i]?.sessions ?? 0,
      })),
    [pageviewsData]
  );

  const hasPreviousData = useMemo(
    () =>
      (pageviewsData?.comparison ?? []).some((p) => p.pageviews > 0 || p.sessions > 0),
    [pageviewsData]
  );

  const pvPct = pageviewsData?.summary.pageviews_pct_change ?? null;
  const sessPct = pageviewsData?.summary.sessions_pct_change ?? null;

  return (
    <div className="rounded-card border border-card-border bg-card p-4">
      <div className="mb-4 text-sm font-medium text-foreground">Pageviews & Sessions over time</div>

      {pageviewsData === null ? null : (
        <>
          <div className="mb-2 flex flex-wrap items-start gap-x-10 gap-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {pageviewsData.summary.current_pageviews.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">pageviews</span>
              {hasPreviousData && <DeltaBadge pct={pvPct} />}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {pageviewsData.summary.current_sessions.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">sessions</span>
              {hasPreviousData && <DeltaBadge pct={sessPct} />}
            </div>
          </div>
          {hasPreviousData && (
            <p className="mb-3 text-xs text-muted-foreground">{comparisonLabel(range)}</p>
          )}

          <div
            className={`mb-3 grid gap-x-6 gap-y-2 text-xs text-muted-foreground ${
              hasPreviousData ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-2"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="h-0 w-5 border-t-2 border-solid" style={{ borderColor: areaPrimary }} />
              <span>Pageviews</span>
            </div>
            {hasPreviousData && (
              <div className="flex items-center gap-2">
                <div
                  className="h-0 w-5 border-t-2 border-dashed opacity-50"
                  style={{ borderColor: areaPrimary }}
                />
                <span>Pageviews (prev)</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="h-0 w-5 border-t-2 border-solid" style={{ borderColor: areaSecondary }} />
              <span>Sessions</span>
            </div>
            {hasPreviousData && (
              <div className="flex items-center gap-2">
                <div
                  className="h-0 w-5 border-t-2 border-dashed opacity-50"
                  style={{ borderColor: areaSecondary }}
                />
                <span>Sessions (prev)</span>
              </div>
            )}
          </div>

          <RechartsSizedContainer className="h-48 w-full md:h-72" style={{ minHeight: 192 }}>
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
                    allowDecimals={false}
                    tick={{ fill: axisTickFill, fontSize: 11 }}
                    width={40}
                  />
                  <RechartsTooltip
                    content={(props) => (
                      <CustomPageviewsTooltip
                        active={props.active}
                        payload={props.payload as unknown as TooltipPayloadEntry[] | undefined}
                        label={props.label !== undefined ? String(props.label) : undefined}
                        range={range}
                        showComparison={hasPreviousData}
                      />
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="pageviews_current"
                    name="Pageviews"
                    stroke={areaPrimary}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  {hasPreviousData && (
                    <Line
                      type="monotone"
                      dataKey="pageviews_prev"
                      name="Pageviews (prev)"
                      stroke={areaPrimary}
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      strokeOpacity={0.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="sessions_current"
                    name="Sessions"
                    stroke={areaSecondary}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  {hasPreviousData && (
                    <Line
                      type="monotone"
                      dataKey="sessions_prev"
                      name="Sessions (prev)"
                      stroke={areaSecondary}
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      strokeOpacity={0.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </RechartsSizedContainer>
        </>
      )}
    </div>
  );
}
