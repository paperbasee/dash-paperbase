"use client";

import { ArrowRight, Check, Copy } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Area, CartesianGrid, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { RechartsSizedContainer } from "@/components/RechartsSizedContainer";
import { SocialMark } from "@/components/SocialMark";
import { Link } from "@/i18n/navigation";
import type { AnalyticsBucket, DashboardAnalyticsPoint, DashboardAnalyticsSummary } from "@/lib/basicAnalyticsService";
import { toLocaleDigits } from "@/lib/locale-digits";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";

const DHAKA = "Asia/Dhaka";
const LINE = "hsl(var(--accent-blue))";
/** The chart's space inside the card, in pixels: its height follows from these (HomeOrdersPanel). */
const CHART_INSET = { top: 20, bottom: 4, side: 20 };
const BEFORE = "hsl(var(--muted-foreground))";

/** Text colours that mean something, and nothing else is coloured (owner, 2026-11-12). */
export const TONE = {
  late: "text-orange-700 dark:text-orange-400",
  risk: "text-rose-600 dark:text-rose-400",
  good: "text-emerald-700 dark:text-emerald-400",
};

/** The overview's tabs, each a part of the period's orders the chart can draw. */
const METRICS = ["orders", "confirmed", "pending", "cancelled"] as const;
type Metric = (typeof METRICS)[number];

/** Which way a change is good: more orders, more confirmed, fewer cancelled; pending is neither. */
const GOOD_WAY: Record<Metric, "up" | "down" | null> = {
  orders: "up",
  confirmed: "up",
  pending: null,
  cancelled: "down",
};

export type PeriodChange =
  | { kind: "same" }
  | { kind: "up" | "down"; percent: number }
  | { kind: "new"; added: number };

/** A number against the same length of time just before: a share of it, to one decimal. */
export function periodChange(now: number, before: number): PeriodChange {
  if (now === before) return { kind: "same" };
  if (before === 0) return { kind: "new", added: now };
  return { kind: now > before ? "up" : "down", percent: Math.round((Math.abs(now - before) / before) * 1000) / 10 };
}

interface HomeOrdersPanelProps {
  summary: DashboardAnalyticsSummary | null;
  /** The same length of time just before; null until known. */
  previous: DashboardAnalyticsSummary | null;
  series: DashboardAnalyticsPoint[];
  previousSeries: DashboardAnalyticsPoint[];
  bucket: AnalyticsBucket;
  /** The shop's address, for the empty chart's "share your shop"; "" while unknown. */
  shopUrl: string;
}

/**
 * The home page's overview (owner's pick of 2026-11-26, like Google Analytics' home): the period's
 * orders and their three parts as tabs, each with its change on the period before, over one
 * chart of the tab picked -- this period a line over a soft fill, the period before dashed.
 */
export function HomeOrdersPanel({ summary, previous, series, previousSeries, bucket, shopUrl }: HomeOrdersPanelProps) {
  const t = useTranslations("dashboard.home");
  const tPages = useTranslations("pages");
  const locale = useLocale();
  const [metric, setMetric] = useState<Metric>("orders");
  const label: Record<Metric, string> = {
    orders: t("orders"),
    confirmed: tPages("orderStatusConfirmed"),
    pending: tPages("orderStatusPending"),
    cancelled: tPages("orderStatusCancelled"),
  };
  const empty = summary !== null && summary.orders === 0;

  // The chart takes the card's spare height (the row is as tall as Right now beside it), so it
  // adds no height of its own; the least it is given is four rows of squares at its width.
  const area = useRef<HTMLDivElement>(null);
  const [areaWidth, setAreaWidth] = useState(0);
  useLayoutEffect(() => {
    const el = area.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => setAreaWidth(Math.floor(el.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const fourRows = areaWidth > 0 ? squareGrid(areaWidth - 2 * CHART_INSET.side, 1, 0).height : 192;

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-card border border-card-border bg-card">
      <div role="tablist" aria-label={t("overviewAria")} className="grid grid-cols-2 gap-px border-b border-border-subtle bg-border-subtle sm:grid-cols-4">
        {METRICS.map((key) => (
          <MetricTab
            key={key}
            metric={key}
            label={label[key]}
            now={summary?.[key]}
            before={previous?.[key]}
            selected={key === metric}
            onSelect={() => setMetric(key)}
            locale={locale}
          />
        ))}
      </div>
      <div ref={area} className="relative flex-1" style={{ minHeight: fourRows + CHART_INSET.top + CHART_INSET.bottom }}>
        <div
          className="absolute"
          style={{ top: CHART_INSET.top, bottom: CHART_INSET.bottom, left: CHART_INSET.side, right: CHART_INSET.side }}
        >
          <MetricLine series={series} previousSeries={previousSeries} metric={metric} bucket={bucket} />
        </div>
        {empty ? <EmptyChart shopUrl={shopUrl} /> : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-4 py-3 text-xs sm:px-6">
        <span className="flex gap-4 text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[2.5px] w-3.5 rounded-full bg-[hsl(var(--accent-blue))]" aria-hidden />
            {t("thisPeriod")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 border-t-2 border-dashed border-muted-foreground/70" aria-hidden />
            {t("periodBefore")}
          </span>
        </span>
        <Link href="/orders" className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:underline">
          {t("viewOrders")}
          <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

function MetricTab({
  metric,
  label,
  now,
  before,
  selected,
  onSelect,
  locale,
}: {
  metric: Metric;
  label: string;
  now: number | undefined;
  before: number | undefined;
  selected: boolean;
  onSelect: () => void;
  locale: string;
}) {
  const t = useTranslations("dashboard.home");
  const digits = (n: number) => toLocaleDigits(String(n), locale);
  const change = now !== undefined && before !== undefined ? periodChange(now, before) : null;
  const good = GOOD_WAY[metric];
  const tone =
    change && (change.kind === "up" || change.kind === "down")
      ? good === null
        ? "text-muted-foreground"
        : change.kind === good
          ? TONE.good
          : TONE.risk
      : "text-muted-foreground";

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "relative flex min-w-0 flex-col gap-1.5 px-4 pb-4 pt-4 text-left transition-colors sm:px-5",
        selected ? "bg-card" : "bg-muted/40 hover:bg-muted/60"
      )}
    >
      {selected ? <span className="absolute inset-x-0 top-0 h-[3px] bg-[hsl(var(--accent-blue))]" aria-hidden /> : null}
      <span className={cn("truncate text-xs", selected ? "font-medium text-foreground/80" : "text-muted-foreground")}>{label}</span>
      <span
        className={cn(
          "text-[1.75rem] font-semibold leading-none tracking-tight",
          selected ? "text-foreground" : "text-foreground/80",
          numberTextClass(locale)
        )}
      >
        {now === undefined ? "—" : digits(now)}
      </span>
      <span className={cn("min-h-4 truncate text-xs font-medium", tone)}>
        {change === null ? null : change.kind === "same" ? (
          t("sameAsBefore")
        ) : change.kind === "new" ? (
          <>+{digits(change.added)}</>
        ) : (
          <>
            {change.kind === "up" ? "▲" : "▼"} {toLocaleDigits(change.percent.toFixed(1), locale)}%
            <span className="ml-1.5 font-normal text-muted-foreground/80">{t("vsValue", { value: digits(before ?? 0) })}</span>
          </>
        )}
      </span>
    </button>
  );
}

/** Copies the shop's link, and says so for a moment. */
function useCopied(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return [copied, (text) => void navigator.clipboard?.writeText(text).then(() => setCopied(true))];
}

/** A period with no orders: what will be drawn here, and the shop's link to bring the next ones. */
function EmptyChart({ shopUrl }: { shopUrl: string }) {
  const t = useTranslations("dashboard.home");
  const [copied, copy] = useCopied();
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/80 px-6 text-center">
      <p className="text-sm font-semibold text-foreground">{t("emptyChartTitle")}</p>
      <p className="text-xs text-muted-foreground">{t("emptyChartBody")}</p>
      {shopUrl ? (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => copy(shopUrl)}
            className="inline-flex h-9 items-center gap-1.5 rounded-ui bg-foreground px-3.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? t("copied") : t("copyShopLink")}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shopUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-ui border border-border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <SocialMark platform="whatsapp" className="size-4" />
            {t("shareOnWhatsApp")}
          </a>
        </div>
      ) : null}
    </div>
  );
}

// The chart's grid is square (owner, 2026-11-12: "the squares of the graph is not equal"): its
// columns had followed the date labels, which fall unevenly (8 days apart, then 12), so the
// boxes differed and the last one most. Now the grid is laid out first -- four rows, and as many
// columns as make each box as wide as it is tall -- and the chart's height follows from it.
//
// No axis of counts (owner, 2026-11-12: on a phone the chart had no "proper space in between 2
// sides" -- the counts took a column on the left only, so the grid sat off-centre and its last
// point met the right edge -- then "no need to show the y axis number just show the number on
// top of the lines"). The grid runs the full width with the same inset on both sides, and the
// line's peaks carry their own counts.
const ROWS = 4;
const TARGET_CELL = 38;
const MIN_LABEL_GAP = 72;
export const CHART_MARGIN = { top: 20, right: 6, left: 6, bottom: 0 };
// The narrowest gap, in pixels, between two counts over the line.
const MIN_PEAK_LABEL_GAP = 22;
const X_AXIS_HEIGHT = 26;

export interface SquareGrid {
  /** The chart's height, so that every box of the grid is a square. */
  height: number;
  /** One box's side, in pixels. */
  cell: number;
  yTicks: number[];
  /** Where the vertical lines fall, in buckets from the first (fractions between them too). */
  xTicks: number[];
  /** A date label on every this-many vertical line, the first and the last among them. */
  labelEvery: number;
  xMax: number;
}

/**
 * The grid for a chart ``width`` wide over buckets 0..``lastIndex`` peaking at ``maxOrders``. Given
 * the ``height`` it may fill (beside the taller Right now card, owner 2026-11-26: "why there is
 * extra bottom space under the chart"), it takes as many rows of the same squares as fit, never
 * fewer than four; the space left over is less than one square.
 */
export function squareGrid(width: number, lastIndex: number, maxOrders: number, height?: number): SquareGrid {
  const plotWidth = Math.max(1, width - CHART_MARGIN.left - CHART_MARGIN.right);
  const labelEvery = Math.max(1, Math.ceil(MIN_LABEL_GAP / TARGET_CELL));
  // Whole groups of labelled columns, so the last line -- now -- carries a label too.
  const groups = Math.max(1, Math.round(plotWidth / (TARGET_CELL * labelEvery)));
  const columns = groups * labelEvery;
  const cell = plotWidth / columns;
  const frame = CHART_MARGIN.top + CHART_MARGIN.bottom + X_AXIS_HEIGHT;
  const rows = height ? Math.max(ROWS, Math.floor((height - frame) / cell)) : ROWS;
  const step = Math.max(1, Math.ceil(maxOrders / rows));
  const xMax = Math.max(lastIndex, 1);
  return {
    height: Math.round(cell * rows + frame),
    cell,
    yTicks: Array.from({ length: rows + 1 }, (_, i) => i * step),
    xTicks: Array.from({ length: columns + 1 }, (_, j) => (j * xMax) / columns),
    labelEvery,
    xMax,
  };
}

/**
 * Which points carry their count over the line: the peaks (a point at least as high as both
 * neighbours, the first of a level run), and the last point -- now -- when it has orders.
 * Higher ones are kept first, and none closer than ``minGap`` buckets to one already kept.
 */
export function peakLabels(values: number[], minGap: number): Set<number> {
  const last = values.length - 1;
  const carries = (i: number) =>
    values[i] > 0 && (i === last || (values[i] > (values[i - 1] ?? 0) && values[i] >= values[i + 1]));
  const order = values
    .map((_, i) => i)
    .filter(carries)
    .sort((a, b) => (a === last ? -1 : b === last ? 1 : values[b] - values[a] || a - b));
  const kept = new Set<number>();
  for (const i of order) {
    if ([...kept].every((k) => Math.abs(k - i) >= minGap)) kept.add(i);
  }
  return kept;
}

interface ChartPoint {
  x: number;
  label: string;
  value: number;
  /** The same bucket of the period before; null where that period is shorter. */
  before: number | null;
}

/** The tab's part across the period: a smooth line over a soft fill, the period before dashed. */
function MetricLine({
  series,
  previousSeries,
  metric,
  bucket,
}: {
  series: DashboardAnalyticsPoint[];
  previousSeries: DashboardAnalyticsPoint[];
  metric: Metric;
  bucket: AnalyticsBucket;
}) {
  const format = useFormatter();
  const locale = useLocale();
  const t = useTranslations("dashboard.home");
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const lastIndex = series.length - 1;
  const points: ChartPoint[] = series.map((point, i) => ({
    x: i,
    label: point.label,
    value: point[metric] ?? 0,
    before: previousSeries[i] ? (previousSeries[i][metric] ?? 0) : null,
  }));
  const maxValue = Math.max(0, ...points.map((point) => Math.max(point.value, point.before ?? 0)));
  const digits = (n: number) => toLocaleDigits(String(n), locale);

  const when = (raw: string, long = false) => {
    const at = new Date(raw);
    if (Number.isNaN(at.getTime())) return raw;
    if (bucket === "minute") return format.dateTime(at, { hour: "numeric", minute: "2-digit", timeZone: DHAKA });
    if (bucket === "hour")
      return format.dateTime(at, long ? { weekday: "short", hour: "numeric", timeZone: DHAKA } : { hour: "numeric", timeZone: DHAKA });
    if (bucket === "month") return format.dateTime(at, { month: long ? "long" : "short", year: long ? "numeric" : undefined, timeZone: DHAKA });
    return format.dateTime(at, long ? { weekday: "short", day: "numeric", month: "short", timeZone: DHAKA } : { day: "numeric", month: "short", timeZone: DHAKA });
  };

  return (
    // Fills the space the card gives it, the chart sitting on its foot.
    <RechartsSizedContainer className="flex h-full items-end">
      {({ width, height }) => {
        const grid = squareGrid(width, lastIndex, maxValue, height);
        const bucketWidth = (grid.cell * (grid.xTicks.length - 1)) / grid.xMax;
        const labelled = peakLabels(
          points.map((point) => point.value),
          Math.max(1, Math.ceil(MIN_PEAK_LABEL_GAP / bucketWidth))
        );
        // A label names the bucket nearest its line; the lines between labels carry none.
        const XTick = (props: { x?: number | string; y?: number | string; payload?: { value?: unknown }; index?: number }) => {
          const i = props.index ?? 0;
          const x = Number(props.x);
          const y = Number(props.y);
          const value = Number(props.payload?.value);
          if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(value)) return <g />;
          if (i % grid.labelEvery !== 0 || points.length === 0) return <g />;
          const point = points[Math.min(lastIndex, Math.max(0, Math.round(value)))];
          const anchor = i === 0 ? "start" : i === grid.xTicks.length - 1 ? "end" : "middle";
          return (
            <text x={x} y={y + 14} textAnchor={anchor} fontSize={11} fill="hsl(var(--muted-foreground))">
              {when(point.label)}
            </text>
          );
        };
        return (
          <ResponsiveContainer width={width} height={grid.height} minWidth={0}>
            <ComposedChart data={points} margin={CHART_MARGIN} aria-label={t("chartAria")} role="img">
              <defs>
                <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={LINE} stopOpacity={0.16} />
                  <stop offset="1" stopColor={LINE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.6} />
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
              {/* Sets the scale only: the counts are drawn over the grid below. */}
              <YAxis hide domain={[0, grid.yTicks[grid.yTicks.length - 1]]} ticks={grid.yTicks} allowDecimals={false} />
              <Tooltip
                cursor={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.5, strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as ChartPoint | undefined;
                  if (!active || !point) return null;
                  return (
                    <div className="flex min-w-44 flex-col gap-1.5 rounded-ui border border-border bg-card px-3 py-2.5 text-xs [box-shadow:var(--shadow-popover)]">
                      <span className="font-semibold text-foreground">{when(point.label, true)}</span>
                      <span className="flex items-center justify-between gap-4">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <span className="size-2 rounded-full bg-[hsl(var(--accent-blue))]" aria-hidden />
                          {t("thisPeriod")}
                        </span>
                        <span className={cn("font-semibold text-foreground", numberTextClass(locale))}>{digits(point.value)}</span>
                      </span>
                      {point.before !== null ? (
                        <span className="flex items-center justify-between gap-4">
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <span className="w-2 border-t-2 border-dashed border-muted-foreground/70" aria-hidden />
                            {t("periodBefore")}
                          </span>
                          <span className={cn("text-muted-foreground", numberTextClass(locale))}>{digits(point.before)}</span>
                        </span>
                      ) : null}
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="before"
                stroke={BEFORE}
                strokeOpacity={0.6}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 3.5, fill: "hsl(var(--card))", stroke: BEFORE, strokeWidth: 1.5 }}
                isAnimationActive={false}
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={LINE}
                strokeWidth={2.25}
                fill={`url(#fill-${id})`}
                isAnimationActive={false}
                dot={(props: { cx?: number; cy?: number; index?: number }) => {
                  const { cx, cy, index } = props;
                  // Now is the line's last point, in blue.
                  if (cx == null || cy == null || index !== lastIndex) return <g key={`dot-${index}`} />;
                  return <circle key={`dot-${index}`} cx={cx} cy={cy} r={4} fill={LINE} />;
                }}
                activeDot={{ r: 5, fill: "hsl(var(--card))", stroke: LINE, strokeWidth: 2.25 }}
              >
                <LabelList
                  dataKey="value"
                  content={(props: { x?: number | string; y?: number | string; index?: number; value?: unknown }) => {
                    const x = Number(props.x);
                    const y = Number(props.y);
                    if (props.index == null || !labelled.has(props.index) || !Number.isFinite(x) || !Number.isFinite(y)) return null;
                    return (
                      <text x={x} y={y - 9} textAnchor="middle" fontSize={11} fontWeight={600} fill="hsl(var(--foreground))">
                        {digits(Number(props.value))}
                      </text>
                    );
                  }}
                />
              </Area>
            </ComposedChart>
          </ResponsiveContainer>
        );
      }}
    </RechartsSizedContainer>
  );
}
