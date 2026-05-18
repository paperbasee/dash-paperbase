"use client";

import { useEffect, useMemo, useState } from "react";
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

import type {
  AnalyticsBucket,
  DashboardAnalyticsPoint,
} from "@/hooks/useDashboardAnalytics";
import { toLocaleDigits } from "@/lib/locale-digits";
import { numberTextClass } from "@/lib/number-font";
import { RechartsSizedContainer } from "@/components/RechartsSizedContainer";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "./ui/card";

interface DashboardBarChartProps {
  data: DashboardAnalyticsPoint[];
  bucket?: AnalyticsBucket;
  /** When true, omit outer card (parent provides section chrome). */
  embedded?: boolean;
  className?: string;
}

export default function DashboardBarChart({
  data,
  bucket = "day",
  embedded = false,
  className,
}: DashboardBarChartProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const numClass = numberTextClass(locale);

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
  const [isTabletRange, setIsTabletRange] = useState(false);

  const formatCountTick = (v: string | number) =>
    toLocaleDigits(String(v), locale);

  /** X-axis uses `label` (dates or ISO hour starts); only there treat hour bucket as time-of-day. */
  const formatCategoryTick = (v: string | number) => {
    const s = String(v);
    if (bucket === "hour") {
      try {
        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return formatCountTick(v);
        const formatted = d.toLocaleTimeString(locale, {
          hour: "numeric",
          minute: "2-digit",
        });
        return toLocaleDigits(formatted, locale);
      } catch {
        return formatCountTick(v);
      }
    }
    return formatCountTick(v);
  };

  const metricSegmentClass = (active: boolean) =>
    cn(
      "inline-flex min-w-0 max-w-full items-center gap-1 rounded-ui px-2 py-1 text-xs font-medium transition whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--card))]",
      active
        ? "bg-foreground text-background"
        : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
    );
  const yAxisWidth = 32;
  const legendHeight = isTabletRange ? 60 : 44;

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    const sync = () => setIsTabletRange(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const chartBody = (
    <>
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center px-2 text-center text-sm leading-relaxed text-muted-foreground">
            {t("chartNoActivity")}
          </div>
        ) : (
          <RechartsSizedContainer className="h-full min-h-[260px] w-full" style={{ minHeight: 260 }}>
            {({ width }) => (
          <ResponsiveContainer
            width={width}
            height={260}
            minWidth={0}
            minHeight={260}
          >
            {/* Recharts SVG: keep square geometry; not using theme radius tokens */}
            <BarChart
              data={data}
              margin={{ top: 20, left: 0, right: yAxisWidth, bottom: 0 }}
              style={{ background: "hsl(var(--card))" }}
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
                tick={{
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 11,
                  className: numClass,
                }}
                tickFormatter={formatCategoryTick}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                allowDecimals={false}
                width={yAxisWidth}
                tick={{
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 11,
                  className: numClass,
                }}
                tickFormatter={formatCountTick}
              />
              <Tooltip
                labelClassName="text-xs font-medium"
                cursor={{
                  fill: "hsl(var(--muted))",
                  opacity: 0.25,
                }}
                contentStyle={{
                  /* Tooltip is Recharts inline style; square corners match chart */
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
                  formatCategoryTick(label === undefined || label === null ? "" : label)
                }
              />
              <Legend
                verticalAlign="top"
                height={legendHeight}
                iconType="circle"
                wrapperStyle={{ fontSize: 11, marginBottom: 16 }}
                content={() => (
                  <div className="flex justify-center px-2">
                    <div
                      className="flex min-h-0 flex-wrap items-center justify-center gap-0.5 rounded-ui border border-border bg-muted/70 p-0.5 text-xs shadow-xs"
                      role="group"
                    >
                      <button
                        type="button"
                        onClick={() => setActiveMetric("all")}
                        className={metricSegmentClass(activeMetric === "all")}
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
                            className={metricSegmentClass(active)}
                          >
                            <span
                              className="size-1.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: m.color,
                                opacity: active ? 1 : 0.5,
                              }}
                              aria-hidden="true"
                            />
                            <span className="min-w-0">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
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
          </RechartsSizedContainer>
        )}
    </>
  );

  if (embedded) {
    return (
      <div className={cn("dashboard-chart-card h-[300px] sm:h-[360px]", className)}>
        <div className="h-full pb-2 pt-1">{chartBody}</div>
      </div>
    );
  }

  return (
    <Card className={cn("dashboard-chart-card h-[360px] border border-card-border bg-card", className)}>
      <CardContent className="h-full pb-2 pt-4">{chartBody}</CardContent>
    </Card>
  );
}
