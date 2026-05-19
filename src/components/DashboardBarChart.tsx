"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  AnalyticsBucket,
  DashboardAnalyticsPoint,
} from "@/lib/basicAnalyticsService";
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

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const chartHeight = isMobile ? 192 : 260;

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

  const formatCountTick = (v: string | number) =>
    toLocaleDigits(String(v), locale);

  /** X-axis uses `label` (dates or ISO hour starts). */
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
    try {
      const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T12:00:00` : s);
      if (!Number.isNaN(d.getTime())) {
        if (bucket === "month") {
          return toLocaleDigits(
            d.toLocaleDateString(locale, { month: "short", year: "2-digit" }),
            locale
          );
        }
        return toLocaleDigits(
          d.toLocaleDateString(locale, { month: "short", day: "numeric" }),
          locale
        );
      }
    } catch {
      // fall through
    }
    return formatCountTick(s);
  };

  const metricSegmentClass = (active: boolean) =>
    cn(
      "inline-flex shrink-0 min-w-0 max-w-full items-center gap-1 rounded-ui px-2 py-1 text-xs font-medium transition whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--card))]",
      active
        ? "bg-foreground text-background"
        : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
    );
  const yAxisWidth = 32;

  const chartBody = (
    <>
        {data.length === 0 ? (
          <div className="flex min-h-[8rem] items-center justify-center px-2 py-6 text-center text-sm leading-relaxed text-muted-foreground md:h-full md:py-0">
            {t("chartNoActivity")}
          </div>
        ) : (
          <>
          <div className="mb-2 w-full min-w-0 px-2 md:flex md:justify-center">
            <div
              className={cn(
                "flex min-h-0 w-full max-w-full items-center rounded-ui border border-border bg-muted/70 p-0.5 text-xs shadow-xs",
                "justify-start overflow-x-auto pb-1 gap-2 [-webkit-overflow-scrolling:touch]",
                "md:w-auto md:max-w-none md:justify-center md:flex-wrap md:overflow-visible md:gap-0.5"
              )}
              role="group"
            >
              {metrics.map((m) => {
                const active = activeMetric === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() =>
                      setActiveMetric((prev) => (prev === m.key ? "all" : m.key))
                    }
                    className={metricSegmentClass(active)}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
          <RechartsSizedContainer
            className={cn(
              "h-48 w-full md:h-full md:min-h-[260px]",
              "[&_.recharts-responsive-container]:!outline-none [&_.recharts-wrapper]:!outline-none",
              "[&_.recharts-surface]:!outline-none [&_*:focus]:!outline-none [&_*:focus]:!shadow-none"
            )}
            style={{ minHeight: chartHeight }}
          >
            {({ width }) => (
          <ResponsiveContainer
            width={width}
            height={chartHeight}
            minWidth={0}
            minHeight={chartHeight}
            tabIndex={-1}
            className="outline-none focus:outline-none focus-visible:outline-none"
          >
            {/* Recharts SVG: keep square geometry; not using theme radius tokens */}
            <BarChart
              data={data}
              margin={{
                top: 20,
                left: 0,
                right: isMobile ? 0 : yAxisWidth,
                bottom: 0,
              }}
              style={{ background: "hsl(var(--card))" }}
              onClick={() => setActiveMetric("all")}
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
                minTickGap={isMobile ? 24 : 40}
                interval={isMobile ? "preserveStartEnd" : "equidistantPreserveStart"}
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
                width={isMobile ? 0 : yAxisWidth}
                tick={
                  isMobile
                    ? false
                    : {
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 11,
                        className: numClass,
                      }
                }
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
          </>
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
    <Card
      className={cn(
        "dashboard-chart-card h-auto border border-card-border bg-card md:h-[360px]",
        className
      )}
    >
      <CardContent className="pb-2 pt-4 md:h-full">{chartBody}</CardContent>
    </Card>
  );
}
