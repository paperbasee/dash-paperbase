"use client";

import { useId } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { RechartsSizedContainer } from "@/components/RechartsSizedContainer";
import { Link } from "@/i18n/navigation";
import type { AnalyticsBucket, DashboardAnalyticsPoint, DashboardAnalyticsSummary } from "@/lib/basicAnalyticsService";
import type { HomeNumbers, WaitingStep } from "@/lib/dashboard/home";
import { toLocaleDigits } from "@/lib/locale-digits";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;
const DHAKA = "Asia/Dhaka";
const LINE = "hsl(var(--accent-blue))";
// Each point gets a marker while there are few enough to tell apart; past that, only the last.
const MARK_EVERY_POINT_UP_TO = 14;

/** Text colours that mean something, and nothing else is coloured (owner, 2026-11-12). */
export const TONE = {
  late: "text-orange-700 dark:text-orange-400",
  risk: "text-rose-600 dark:text-rose-400",
  good: "text-emerald-700 dark:text-emerald-400",
};

interface HomeOrdersPanelProps {
  summary: DashboardAnalyticsSummary | null;
  /** Orders placed in the same length of time just before; null until known. */
  previousOrders: number | null;
  series: DashboardAnalyticsPoint[];
  bucket: AnalyticsBucket;
  /** The order flow, right now; null when the member may not open orders. */
  flow: HomeNumbers["flow"] | undefined;
  now: number;
}

/**
 * The home page's top panel: on the left, the orders placed in the period the switch picks,
 * split by where they stand, with a line of orders across the period under them; on the
 * right, where every order is now.
 */
export function HomeOrdersPanel({ summary, previousOrders, series, bucket, flow, now }: HomeOrdersPanelProps) {
  return (
    <section
      className={cn(
        "grid overflow-hidden rounded-card border border-card-border bg-card",
        flow && "lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]"
      )}
    >
      <div className="flex min-w-0 flex-col gap-5 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
        <PeriodSummary summary={summary} previousOrders={previousOrders} />
        <OrdersLine series={series} bucket={bucket} />
      </div>
      {flow ? <OrderFlow flow={flow} now={now} /> : null}
    </section>
  );
}

function PeriodSummary({
  summary,
  previousOrders,
}: Pick<HomeOrdersPanelProps, "summary" | "previousOrders">) {
  const t = useTranslations("dashboard.home");
  const tPages = useTranslations("pages");
  const locale = useLocale();
  const digits = (n: number) => toLocaleDigits(String(n), locale);
  const numbers = numberTextClass(locale);
  const change = summary && previousOrders !== null ? summary.orders - previousOrders : null;

  const parts = [
    { key: "confirmed", label: tPages("orderStatusConfirmed"), value: summary?.confirmed, swatch: "bg-foreground" },
    { key: "pending", label: tPages("orderStatusPending"), value: summary?.pending, swatch: "bg-foreground/35" },
    { key: "cancelled", label: tPages("orderStatusCancelled"), value: summary?.cancelled, swatch: "bg-rose-500" },
  ];

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">{t("orders")}</h2>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={cn("text-[2.75rem] font-semibold leading-none tracking-tight text-foreground sm:text-5xl", numbers)}>
            {summary ? digits(summary.orders) : "—"}
          </span>
          {change !== null ? (
            <span className="text-xs text-muted-foreground">
              {change === 0 ? (
                t("noChange")
              ) : (
                <>
                  <span className={cn("font-medium", change > 0 ? TONE.good : TONE.risk)}>
                    {change > 0 ? "+" : "−"}
                    {digits(Math.abs(change))}
                  </span>{" "}
                  {t("vsBefore")}
                </>
              )}
            </span>
          ) : null}
        </div>
        <dl className="flex flex-wrap gap-x-7 gap-y-2">
          {parts.map((part) => (
            <div key={part.key} className="flex flex-col gap-0.5">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("size-2 rounded-[2px]", part.swatch)} aria-hidden />
                {part.label}
              </dt>
              <dd className={cn("text-lg font-semibold tracking-tight text-foreground", numbers)}>
                {part.value === undefined ? "—" : digits(part.value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      {summary && summary.orders > 0 ? (
        <div className="mt-4 flex h-1 gap-0.5 overflow-hidden rounded-full" aria-hidden>
          <span className="bg-foreground" style={{ flex: summary.confirmed }} />
          <span className="bg-foreground/35" style={{ flex: summary.pending }} />
          <span className="bg-rose-500" style={{ flex: summary.cancelled }} />
        </div>
      ) : null}
    </div>
  );
}

// The chart's grid is square (owner, 2026-11-12: "the squares of the graph is not equal"): its
// columns had followed the date labels, which fall unevenly (8 days apart, then 12), so the
// boxes differed and the last one most. Now the grid is laid out first -- four rows, and as many
// columns as make each box as wide as it is tall -- and the chart's height follows from it.
const ROWS = 4;
const TARGET_CELL = 38;
const MIN_LABEL_GAP = 72;
const MARGIN = { top: 12, right: 10, left: 0, bottom: 0 };
const Y_AXIS_WIDTH = 30;
const X_AXIS_HEIGHT = 26;

export interface SquareGrid {
  /** The chart's height, so that every box of the grid is a square. */
  height: number;
  yTicks: number[];
  /** Where the vertical lines fall, in buckets from the first (fractions between them too). */
  xTicks: number[];
  /** A date label on every this-many vertical line, the first and the last among them. */
  labelEvery: number;
  xMax: number;
}

/** The grid for a chart ``width`` wide over buckets 0..``lastIndex`` peaking at ``maxOrders``. */
export function squareGrid(width: number, lastIndex: number, maxOrders: number): SquareGrid {
  const plotWidth = Math.max(1, width - Y_AXIS_WIDTH - MARGIN.left - MARGIN.right);
  const labelEvery = Math.max(1, Math.ceil(MIN_LABEL_GAP / TARGET_CELL));
  // Whole groups of labelled columns, so the last line -- now -- carries a label too.
  const groups = Math.max(1, Math.round(plotWidth / (TARGET_CELL * labelEvery)));
  const columns = groups * labelEvery;
  const cell = plotWidth / columns;
  const step = Math.max(1, Math.ceil(maxOrders / ROWS));
  const xMax = Math.max(lastIndex, 1);
  return {
    height: Math.round(cell * ROWS + MARGIN.top + MARGIN.bottom + X_AXIS_HEIGHT),
    yTicks: Array.from({ length: ROWS + 1 }, (_, i) => i * step),
    xTicks: Array.from({ length: columns + 1 }, (_, j) => (j * xMax) / columns),
    labelEvery,
    xMax,
  };
}

/** Orders across the period as a line: straight runs between buckets over a striped fill. */
function OrdersLine({ series, bucket }: Pick<HomeOrdersPanelProps, "series" | "bucket">) {
  const format = useFormatter();
  const locale = useLocale();
  const t = useTranslations("dashboard.home");
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const lastIndex = series.length - 1;
  const markAll = series.length <= MARK_EVERY_POINT_UP_TO;
  const points = series.map((point, i) => ({ ...point, x: i }));
  const maxOrders = Math.max(0, ...series.map((point) => point.orders));

  const when = (raw: string, long = false) => {
    const at = new Date(raw);
    if (Number.isNaN(at.getTime())) return raw;
    if (bucket === "minute") return format.dateTime(at, { hour: "numeric", minute: "2-digit", timeZone: DHAKA });
    if (bucket === "hour")
      return format.dateTime(at, long ? { weekday: "short", hour: "numeric", timeZone: DHAKA } : { hour: "numeric", timeZone: DHAKA });
    if (bucket === "month") return format.dateTime(at, { month: long ? "long" : "short", year: long ? "numeric" : undefined, timeZone: DHAKA });
    return format.dateTime(at, long ? { weekday: "long", day: "numeric", month: "long", timeZone: DHAKA } : { day: "numeric", month: "short", timeZone: DHAKA });
  };

  return (
    <RechartsSizedContainer className="w-full">
      {({ width }) => {
        const grid = squareGrid(width, lastIndex, maxOrders);
        // A label names the bucket nearest its line; the lines between labels carry none.
        const XTick = (props: { x?: number | string; y?: number | string; payload?: { value?: unknown }; index?: number }) => {
          const i = props.index ?? 0;
          const x = Number(props.x);
          const y = Number(props.y);
          const value = Number(props.payload?.value);
          if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(value)) return <g />;
          if (i % grid.labelEvery !== 0 || series.length === 0) return <g />;
          const point = series[Math.min(lastIndex, Math.max(0, Math.round(value)))];
          const anchor = i === 0 ? "start" : i === grid.xTicks.length - 1 ? "end" : "middle";
          return (
            <text x={x} y={y + 14} textAnchor={anchor} fontSize={11} fill="hsl(var(--muted-foreground))">
              {when(point.label)}
            </text>
          );
        };
        return (
          <ResponsiveContainer width={width} height={grid.height} minWidth={0}>
            <AreaChart data={points} margin={MARGIN} aria-label={t("chartAria")} role="img">
              <defs>
                <pattern id={`stripes-${id}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="7" height="7" fill={LINE} fillOpacity={0.06} />
                  <line x1="0" y1="0" x2="0" y2="7" stroke={LINE} strokeOpacity={0.14} strokeWidth="2.5" />
                </pattern>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.7} />
              <XAxis
                type="number"
                dataKey="x"
                domain={[0, grid.xMax]}
                ticks={grid.xTicks}
                interval={0}
                height={X_AXIS_HEIGHT}
                tickLine={false}
                axisLine={false}
                tick={XTick}
              />
              <YAxis
                domain={[0, grid.yTicks[ROWS]]}
                ticks={grid.yTicks}
                interval={0}
                tickLine={false}
                axisLine={false}
                width={Y_AXIS_WIDTH}
                allowDecimals={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(v) => toLocaleDigits(String(v), locale)}
              />
              <Tooltip
                cursor={{ stroke: LINE, strokeWidth: 1 }}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as DashboardAnalyticsPoint | undefined;
                  if (!active || !point) return null;
                  return (
                    <div className="flex min-w-36 flex-col items-center gap-0.5 rounded-ui border border-border bg-card px-3.5 py-2 text-center [box-shadow:var(--shadow-popover)]">
                      <span className={cn("text-base font-semibold text-foreground", numberTextClass(locale))}>
                        {toLocaleDigits(String(point.orders), locale)}
                      </span>
                      <span className="text-xs text-muted-foreground">{when(point.label, true)}</span>
                    </div>
                  );
                }}
              />
              <Area
                type="linear"
                dataKey="orders"
                stroke={LINE}
                strokeWidth={1.75}
                fill={`url(#stripes-${id})`}
                isAnimationActive={false}
                dot={(props: { cx?: number; cy?: number; index?: number }) => {
                  const { cx, cy, index } = props;
                  if (cx == null || cy == null || (!markAll && index !== lastIndex)) return <g key={`dot-${index}`} />;
                  const last = index === lastIndex;
                  return (
                    <circle
                      key={`dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={last ? 4 : 3.5}
                      fill={last ? LINE : "hsl(var(--card))"}
                      stroke={LINE}
                      strokeWidth={1.5}
                    />
                  );
                }}
                activeDot={{ r: 5, fill: "hsl(var(--card))", stroke: LINE, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      }}
    </RechartsSizedContainer>
  );
}

function OrderFlow({ flow, now }: { flow: NonNullable<HomeNumbers["flow"]>; now: number }) {
  const t = useTranslations("dashboard.home");
  const tPages = useTranslations("pages");
  const format = useFormatter();
  const locale = useLocale();

  const waited = (step: WaitingStep) => {
    if (!step.oldest_at) return { text: t("nothingWaiting"), tone: "" };
    const since = new Date(step.oldest_at);
    return {
      text: t("oldest", { when: format.relativeTime(since, now) }),
      tone: now - since.getTime() >= DAY_MS ? TONE.late : "",
    };
  };

  const cells = [
    { key: "pending", href: "/orders?status=pending", name: tPages("orderStatusPending"), count: flow.pending.count, note: waited(flow.pending) },
    {
      key: "payment",
      href: "/orders?status=payment_pending",
      name: tPages("orderStatusPaymentPending"),
      count: flow.payment_pending.count,
      note: waited(flow.payment_pending),
    },
    {
      key: "send",
      href: "/orders?status=confirmed&delivery_status=not_dispatched",
      name: t("flowToSend"),
      count: flow.to_send.count,
      note: waited(flow.to_send),
    },
    {
      key: "transit",
      href: flow.in_transit.stuck ? "/orders?queue=stuck" : "/orders?delivery_status=in_transit",
      name: t("flowOnTheWay"),
      count: flow.in_transit.count,
      note: flow.in_transit.stuck
        ? { text: t("stuck", { count: toLocaleDigits(String(flow.in_transit.stuck), locale) }), tone: TONE.risk }
        : { text: "", tone: "" },
    },
    {
      key: "delivered",
      href: "/orders?queue=delivered_today",
      name: t("flowDeliveredToday"),
      count: flow.delivered_today.count,
      note: { text: t("sinceMidnight"), tone: "" },
    },
    {
      key: "returned",
      href: "/orders?queue=returned_recently",
      name: t("flowReturned"),
      count: flow.returned_recently.count,
      note: { text: t("lastSevenDays"), tone: "" },
    },
  ];

  return (
    // Two cells a row, three rows tall beside the orders; the hairlines between them are the
    // panel's border colour showing through a 1px gap, so they sit right at every width.
    <div className="grid grid-cols-2 gap-px border-t border-border-subtle bg-border-subtle sm:grid-cols-3 lg:grid-cols-2 lg:grid-rows-3 lg:border-l lg:border-t-0">
      {cells.map((cell) => (
        <Link
          key={cell.key}
          href={cell.href}
          className="flex min-w-0 flex-col justify-center gap-1 bg-card px-4 py-4 transition-colors hover:bg-muted/40 sm:px-5"
        >
          <span className="truncate text-xs text-muted-foreground">{cell.name}</span>
          <span className={cn("text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground", numberTextClass(locale))}>
            {toLocaleDigits(String(cell.count), locale)}
          </span>
          <span className={cn("min-h-[1.125rem] truncate text-xs text-muted-foreground/80", cell.note.tone)}>{cell.note.text}</span>
        </Link>
      ))}
    </div>
  );
}
