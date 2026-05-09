"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { areaPrimary, axisTickFill, chartGridStroke, tooltipStyle } from "./constants";
import { formatChartAxisLabel } from "./format";
import type { RangeOption, RevenuePoint } from "./types";

export function RevenueChartCard({
  data,
  range,
  currencySymbol,
}: {
  data: RevenuePoint[];
  range: RangeOption;
  currencySymbol: string;
}) {
  return (
    <div className="flex h-auto min-h-0 flex-col rounded-card border border-card-border bg-card p-4 lg:col-span-3 lg:h-full">
      <div className="mb-4 shrink-0 text-sm font-medium text-foreground">Revenue over time</div>
      {/* Mobile: no flex-1 / min-height so the card height matches h-48 chart; lg+: grow with grid stretch */}
      <div className="flex w-full min-w-0 flex-col lg:flex-1 lg:min-h-0">
        <div className="h-48 w-full md:h-72 lg:h-auto lg:min-h-72 lg:flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, left: 0, right: 24, bottom: 8 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={areaPrimary} stopOpacity={0.55} />
                  <stop offset="95%" stopColor={areaPrimary} stopOpacity={0.05} />
                </linearGradient>
              </defs>
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
                contentStyle={tooltipStyle}
                labelFormatter={(l) => formatChartAxisLabel(String(l), range)}
                formatter={(v) => `${currencySymbol}${Number(v).toLocaleString()}`}
              />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke={areaPrimary} fill="url(#revFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
