"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
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
import { toLocaleDigits } from "@/lib/locale-digits";
import { Card, CardContent } from "./ui/card";

interface DashboardBarChartProps {
  data: DashboardAnalyticsPoint[];
}

export default function DashboardBarChart({ data }: DashboardBarChartProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  const metrics = useMemo(
    () =>
      [
        {
          key: "orders",
          label: t("chartOrders"),
          color: "hsl(var(--chart-orders))",
        },
        {
          key: "products",
          label: t("chartProducts"),
          color: "hsl(var(--chart-products))",
        },
        {
          key: "customers",
          label: t("chartCustomers"),
          color: "hsl(var(--chart-customers))",
        },
        {
          key: "supportTickets",
          label: t("chartSupportTickets"),
          color: "hsl(var(--chart-support-tickets))",
        },
      ] as const,
    [t]
  );

  type MetricKey = (typeof metrics)[number]["key"];

  const [activeMetric, setActiveMetric] = useState<MetricKey | "all">("all");

  const formatTick = (v: string | number) =>
    toLocaleDigits(String(v), locale);

  const metricFilterBtnBase =
    "min-w-0 max-w-full break-words rounded-md border px-2 py-1 text-[11px] font-medium leading-relaxed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--card))]";

  return (
    <Card className="dashboard-chart-card h-[360px] border border-card-border bg-card">
      <CardContent className="h-full pb-2 pt-4">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center px-2 text-center text-sm leading-relaxed text-muted-foreground">
            {t("chartNoActivity")}
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
                tickFormatter={formatTick}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                allowDecimals={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={formatTick}
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
                formatter={(value) =>
                  toLocaleDigits(
                    value === undefined || value === null ? "" : String(value),
                    locale
                  )
                }
                labelFormatter={(label) =>
                  toLocaleDigits(
                    label === undefined || label === null ? "" : String(label),
                    locale
                  )
                }
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
                        metricFilterBtnBase,
                        activeMetric === "all"
                          ? "border-primary/30 bg-primary/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground",
                      ].join(" ")}
                    >
                      {t("chartAll")}
                    </button>
                    {metrics.map((m) => {
                      const active = activeMetric === m.key;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setActiveMetric(m.key)}
                          className={[
                            "inline-flex items-center gap-1.5",
                            metricFilterBtnBase,
                            active
                              ? "border-primary/30 bg-primary/10 text-foreground"
                              : "border-border bg-background text-muted-foreground hover:text-foreground",
                          ].join(" ")}
                        >
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{
                              backgroundColor: m.color,
                              opacity: active ? 1 : 0.35,
                            }}
                            aria-hidden="true"
                          />
                          <span className="min-w-0">{m.label}</span>
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
