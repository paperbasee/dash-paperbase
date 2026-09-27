"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useTranslations } from "next-intl";

import { CHART_COLORS, axisTickFill, chartGridStroke, tooltipStyle } from "./constants";
import { formatChartAxisLabel } from "./format";
import type { RangeOption, TrafficDimension, UTMData } from "./types";
import { RechartsSizedContainer } from "@/components/RechartsSizedContainer";

const DIMENSIONS: TrafficDimension[] = ["channel", "source", "medium", "campaign"];
const CHANNELS = [
  "direct",
  "organic_social",
  "paid_social",
  "organic_search",
  "paid_search",
  "email",
  "referral",
  "other_campaign",
] as const;
/** The API's names for what it could not name (analytics/views.py, sources.py). */
const PLACEHOLDERS: Record<string, "direct" | "notTracked" | "notSet"> = {
  "(direct)": "direct",
  "(not tracked)": "notTracked",
  "(not set)": "notSet",
};

export function TrafficAcquisitionSection({
  utmData,
  utmLoading,
  utmDimension,
  onUtmDimensionChange,
  range,
  currencySymbol,
}: {
  utmData: UTMData | null;
  utmLoading: boolean;
  utmDimension: TrafficDimension;
  onUtmDimensionChange: (dim: TrafficDimension) => void;
  range: RangeOption;
  currencySymbol: string;
}) {
  const t = useTranslations("analyticsPage.traffic");
  // A channel is a code, "(direct)" and the like are the API's placeholders;
  // anything else -- a site, a campaign -- is shown as the shopper's link said.
  // The chart's "other" is everything outside its five biggest.
  const label = (value: string) => {
    if (PLACEHOLDERS[value]) return t(PLACEHOLDERS[value]);
    if (utmDimension === "channel" && (CHANNELS as readonly string[]).includes(value)) {
      return t(`channels.${value as (typeof CHANNELS)[number]}`);
    }
    return value;
  };

  return (
    <div className="rounded-card border border-border bg-card p-4 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
        <div className="-mx-1 overflow-x-auto px-1 sm:mx-0 sm:px-0">
          <div className="inline-flex min-w-max items-center gap-1 rounded-ui border border-border bg-muted/70 p-1 text-sm shadow-xs">
            {DIMENSIONS.map((dim) => (
              <button
                key={dim}
                type="button"
                onClick={() => onUtmDimensionChange(dim)}
                className={`whitespace-nowrap rounded-ui px-3 py-1.5 font-medium transition ${
                  utmDimension === dim
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                }`}
              >
                {t(`dimensions.${dim}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-card border border-border bg-background p-3">
        <div className="mb-3 text-sm font-medium text-foreground">
          {t("overTime", { dimension: t(`dimensions.${utmDimension}`).toLowerCase() })}
        </div>
        {utmLoading ? null : (
          <RechartsSizedContainer className="h-48 w-full md:h-72" style={{ minHeight: 192 }}>
            {({ width, height }) => (
              <ResponsiveContainer width={width} height={height} minWidth={0}>
              <AreaChart data={utmData?.chart ?? []} margin={{ top: 8, left: 0, right: 24, bottom: 0 }}>
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
                  contentStyle={tooltipStyle}
                  labelFormatter={(l) => formatChartAxisLabel(String(l), range)}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  height={44}
                />
                {(utmData?.top_values ?? []).map((key, idx) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={label(key)}
                    stroke={CHART_COLORS[idx % 5]}
                    strokeWidth={2}
                    fill={CHART_COLORS[idx % 5]}
                    fillOpacity={0.15}
                  />
                ))}
                <Area
                  type="monotone"
                  dataKey="other"
                  name={t("other")}
                  stroke={CHART_COLORS[5]}
                  strokeWidth={2}
                  fill={CHART_COLORS[5]}
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </RechartsSizedContainer>
        )}
      </div>

      <div className="rounded-card border border-border bg-card overflow-hidden">
        <div className="overflow-auto max-h-[360px] md:max-h-[520px]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted sticky top-0 z-10">
                <th className="px-4 py-3 whitespace-nowrap">{t(`dimensions.${utmDimension}`)}</th>
                <th className="px-4 py-3 whitespace-nowrap">{t("columns.sessions")}</th>
                <th className="px-4 py-3 whitespace-nowrap">{t("columns.change")}</th>
                <th className="px-4 py-3 whitespace-nowrap">{t("columns.orders")}</th>
                <th className="px-4 py-3 whitespace-nowrap">{t("columns.sales")}</th>
                <th className="px-4 py-3 whitespace-nowrap">{t("columns.conversion")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {utmLoading ? null : (utmData?.table?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                (utmData?.table ?? []).map((row) => (
                  <tr key={row.value}>
                    <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[18rem]">
                      {label(row.value)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.sessions}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        {row.mom === null || Number.isNaN(row.mom) ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span
                            className={
                              row.mom >= 0
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-rose-700 dark:text-rose-300"
                            }
                          >
                            {row.mom >= 0 ? "↑" : "↓"} {Math.abs(row.mom).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.orders}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {currencySymbol}
                      {Number(row.sales || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {Number(row.conversion_rate || 0).toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
