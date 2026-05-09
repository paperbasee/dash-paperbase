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
    <div className="flex h-full min-h-0 flex-col rounded-card border border-card-border bg-card p-4 lg:col-span-3">
      <div className="mb-4 shrink-0 text-sm font-medium text-foreground">Revenue over time</div>
      <div className="flex min-h-[280px] w-full min-w-0 flex-1 flex-col">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minHeight={280}
          minWidth={0}
          initialDimension={{ width: 800, height: 320 }}
          className="min-h-[280px] flex-1"
        >
          <AreaChart data={data} margin={{ top: 8, left: 0, right: 24, bottom: 8 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={areaPrimary} stopOpacity={0.55} />
                <stop offset="95%" stopColor={areaPrimary} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridStroke} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tick={{ fill: axisTickFill, fontSize: 11 }}
              tickFormatter={(v) => formatChartAxisLabel(String(v), range)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: axisTickFill, fontSize: 11 }}
              tickFormatter={(v) => `${currencySymbol}${Number(v).toLocaleString()}`}
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
  );
}
