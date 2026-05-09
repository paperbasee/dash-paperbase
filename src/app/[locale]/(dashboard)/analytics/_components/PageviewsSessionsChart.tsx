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

import {
  areaPrimary,
  areaSecondary,
  axisTickFill,
  chartGridStroke,
  tooltipStyle,
} from "./constants";
import { formatChartAxisLabel } from "./format";
import type { PageviewsPoint, RangeOption } from "./types";

export function PageviewsSessionsChart({
  data,
  range,
}: {
  data: PageviewsPoint[];
  range: RangeOption;
}) {
  return (
    <div className="rounded-card border border-card-border bg-card p-4">
      <div className="mb-4 text-sm font-medium text-foreground">Pageviews & Sessions over time</div>
      <div className="h-48 w-full md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, left: 0, right: 24, bottom: 0 }}>
            <defs>
              <linearGradient id="pvFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={areaPrimary} stopOpacity={0.6} />
                <stop offset="95%" stopColor={areaPrimary} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="sessFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={areaSecondary} stopOpacity={0.4} />
                <stop offset="95%" stopColor={areaSecondary} stopOpacity={0.05} />
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
              allowDecimals={false}
              tick={{ fill: axisTickFill, fontSize: 11 }}
              width={40}
            />
            <RechartsTooltip
              contentStyle={tooltipStyle}
              labelFormatter={(l) => formatChartAxisLabel(String(l), range)}
              formatter={(v, name) => [v, name]}
            />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
            <Area
              type="monotone"
              dataKey="pageviews"
              name="Pageviews"
              stroke={areaPrimary}
              fill="url(#pvFill)"
            />
            <Area
              type="monotone"
              dataKey="sessions"
              name="Sessions"
              stroke={areaSecondary}
              fill="url(#sessFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
