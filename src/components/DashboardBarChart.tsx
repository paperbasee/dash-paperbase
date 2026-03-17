"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DashboardAnalyticsPoint } from "@/hooks/useDashboardAnalytics";
import { Card, CardContent } from "./ui/card";

interface DashboardBarChartProps {
  data: DashboardAnalyticsPoint[];
}

export default function DashboardBarChart({ data }: DashboardBarChartProps) {
  const metrics = useMemo(
    () =>
      [
        {
          key: "orders",
          label: "Orders",
          color: "hsl(var(--chart-orders))",
        },
        {
          key: "products",
          label: "Products",
          color: "hsl(var(--chart-products))",
        },
        {
          key: "cartItems",
          label: "Cart items",
          color: "hsl(var(--chart-carts))",
        },
        {
          key: "wishlistItems",
          label: "Wishlist",
          color: "hsl(var(--chart-wishlist))",
        },
        {
          key: "contacts",
          label: "Contacts",
          color: "hsl(var(--chart-contacts))",
        },
      ] as const,
    [],
  );

  type MetricKey = (typeof metrics)[number]["key"];

  const [activeMetric, setActiveMetric] = useState<MetricKey | "all">("all");

  return (
    <Card className="h-[360px] border border-card-border bg-card">
      <CardContent className="h-full pb-2 pt-4">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No activity for the selected period.
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height={260}
            minWidth={0}
            minHeight={260}
          >
            <BarChart
              data={data}
              margin={{ top: 8, left: 0, right: 0, bottom: 0 }}
              style={{ background: "hsl(var(--card))", borderRadius: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                allowDecimals={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <Tooltip
                labelClassName="text-xs font-medium"
                cursor={{
                  fill: "hsl(var(--muted))",
                  opacity: 0.25,
                }}
                contentStyle={{
                  borderRadius: 0,
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.25)",
                  fontSize: 12,
                  backgroundColor: "hsl(var(--card))",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Legend
                verticalAlign="top"
                height={32}
                iconType="circle"
                wrapperStyle={{ fontSize: 11 }}
                content={() => (
                  <div className="flex flex-wrap items-center justify-center gap-1 px-2 pb-1">
                    <button
                      type="button"
                      onClick={() => setActiveMetric("all")}
                      className={[
                        "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                        activeMetric === "all"
                          ? "border-primary/30 bg-primary/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground",
                      ].join(" ")}
                    >
                      All
                    </button>
                    {metrics.map((m) => {
                      const active = activeMetric === m.key;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setActiveMetric(m.key)}
                          className={[
                            "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                            active
                              ? "border-primary/30 bg-primary/10 text-foreground"
                              : "border-border bg-background text-muted-foreground hover:text-foreground",
                          ].join(" ")}
                        >
                          <span
                            className="size-2 rounded-full"
                            style={{
                              backgroundColor: m.color,
                              opacity: active ? 1 : 0.35,
                            }}
                            aria-hidden="true"
                          />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              />
              {metrics.map((m) => {
                const visible = activeMetric === "all" || activeMetric === m.key;
                return visible ? (
                  <Bar
                    key={m.key}
                    dataKey={m.key}
                    name={m.label}
                    stackId="activity"
                    fill={m.color}
                  />
                ) : null;
              })}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

