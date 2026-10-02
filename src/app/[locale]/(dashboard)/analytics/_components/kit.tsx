"use client";

import { type ReactNode, useId, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { RechartsSizedContainer } from "@/components/RechartsSizedContainer";
import { Tooltip as HintTip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { useAnalyticsView } from "../_lib/context";
import { changeOf } from "../_lib/insights";
import type { Card, ChartPoint, PeriodInfo, SectionKey } from "../_lib/types";

/**
 * The pieces every section of the analytics page is built from, drawn to the
 * chosen design (2026-09-28): white cards, a strip of headline numbers, lists
 * with a bar behind each row, and a line against the compared days.
 */

/** The page's surfaces: a white card with a hairline border. */
export const CARD = "rounded-card border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
const LINK =
  "inline-flex shrink-0 items-center gap-0.5 rounded-ui text-[13px] font-medium text-blue-600 hover:underline dark:text-blue-400";

/** Where "see more" goes: another section of the page, or another page of the dashboard. */
export type More = { label: string } & ({ section: SectionKey } | { href: string });

export function MoreLink({ more }: { more: More }) {
  const { goTo } = useAnalyticsView();
  const inner = (
    <>
      {more.label}
      <ChevronRight className="size-3.5" aria-hidden />
    </>
  );
  return "href" in more ? (
    <Link href={more.href} className={LINK}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={() => goTo(more.section)} className={LINK}>
      {inner}
    </button>
  );
}

export function Panel({
  title,
  note,
  more,
  aside,
  children,
  className,
}: {
  title: string;
  note?: string;
  /** Another section this panel is a glimpse of. */
  more?: More;
  /** Beside the title instead: a chart's key. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(CARD, "flex min-w-0 flex-col gap-4 p-4 sm:p-5 lg:px-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
          {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
        </div>
        {more ? <MoreLink more={more} /> : aside}
      </div>
      {children}
    </section>
  );
}

/** A headline number's name; with a hint, it opens a line on what it counts. */
export function StatLabel({ label, hint, strong = false }: { label: string; hint?: string; strong?: boolean }) {
  const text = cn("text-[13px] font-medium", strong ? "text-foreground" : "text-muted-foreground");
  if (!hint) return <span className={cn(text, "truncate")}>{label}</span>;
  return (
    <HintTip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(text, "max-w-full self-start truncate border-b border-dashed border-muted-foreground/40 text-left")}
        >
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" variant="light" className="max-w-64">
        <p className="leading-relaxed">{hint}</p>
      </TooltipContent>
    </HintTip>
  );
}

/** How far a headline number moved, whether that is good news, and what it was. */
export function Change({
  card,
  show,
  lowerIsBetter = false,
  plain,
}: {
  card: Card<number | string>;
  /** How the compared value is written. */
  show: (value: number | string) => string;
  lowerIsBetter?: boolean;
  /** How a `plain` change is written (days, pieces). */
  plain?: (n: number) => string;
}) {
  const t = useTranslations("analyticsPage");
  const { format } = useAnalyticsView();
  const was = card.previous === null ? null : t("from", { value: show(card.previous) });
  if (card.change === null || Number.isNaN(card.change)) {
    return <p className="text-xs text-muted-foreground">{was ?? "—"}</p>;
  }
  const up = card.change > 0;
  const good = card.change === 0 ? null : lowerIsBetter ? !up : up;
  const size = Math.abs(card.change);
  const text =
    card.unit === "percent"
      ? format.percent(size)
      : card.unit === "points"
        ? t("points", { n: format.decimal(size) })
        : plain
          ? plain(size)
          : format.decimal(size);
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-semibold",
          good === null ? "text-muted-foreground" : good ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400",
        )}
      >
        {card.change === 0 ? null : <Arrow className="size-3.5" aria-hidden />}
        {text}
      </span>
      {was ? <span className="text-muted-foreground">{was}</span> : null}
    </p>
  );
}

/** The headline numbers of a section, side by side in one strip. */
export function StatStrip({ children, count }: { children: ReactNode; count: 2 | 4 }) {
  return (
    <div
      className={cn(
        CARD,
        "grid grid-cols-2 gap-px overflow-hidden bg-border",
        count === 4 && "lg:grid-cols-4",
      )}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  hint,
  card,
  show,
  lowerIsBetter,
  plain,
}: {
  label: string;
  /** What the number counts, in one line. */
  hint?: string;
  card: Card<number | string>;
  /** How the number is written. */
  show: (value: number | string) => string;
  lowerIsBetter?: boolean;
  plain?: (n: number) => string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 bg-card px-4 py-3.5 sm:px-5 sm:py-4">
      <StatLabel label={label} hint={hint} />
      <span className="truncate text-xl font-semibold tracking-tight text-foreground tabular-nums sm:text-2xl">
        {card.value === null ? "—" : show(card.value)}
      </span>
      <Change card={card} show={show} lowerIsBetter={lowerIsBetter} plain={plain} />
    </div>
  );
}

/** A number column of a list; `wide` ones are left out on a phone, where there is no room. */
export type Column = { label: string; wide?: boolean; width?: string };

export type TableRow = {
  key: string;
  label: ReactNode;
  detail?: ReactNode;
  values: ReactNode[];
  /** How far the bar behind the row reaches, 0-100. */
  share: number;
};

const COLUMN = "w-16 sm:w-20";

function Cell({ column, children, strong = false }: { column: Column; children: ReactNode; strong?: boolean }) {
  return (
    <span
      className={cn(
        column.width ?? COLUMN,
        "shrink-0 text-right tabular-nums",
        strong ? "font-semibold" : undefined,
        column.wide && "hidden sm:block",
      )}
    >
      {children}
    </span>
  );
}

/** Rows with a bar behind each, sized against the rest, and their numbers in columns. */
export function BarTable({ columns, rows, empty }: { columns: Column[]; rows: TableRow[]; empty?: string }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  const last = columns.length - 1;
  return (
    <ul className="flex flex-col">
      {rows.map((row) => (
        <li key={row.key} className="relative flex min-h-10 items-center justify-between gap-3 px-2.5 py-1.5">
          <span
            aria-hidden
            className="absolute inset-y-1 left-0 rounded-ui bg-blue-500/10 dark:bg-blue-400/15"
            style={{ width: `${Math.max(0, Math.min(100, row.share))}%` }}
          />
          <span className="relative flex min-w-0 flex-col">
            <span className="truncate text-[13px] text-foreground">{row.label}</span>
            {row.detail ? <span className="truncate text-xs text-muted-foreground">{row.detail}</span> : null}
          </span>
          <span className="relative flex shrink-0 text-[13px] text-foreground">
            {row.values.map((value, index) => (
              <Cell key={index} column={columns[index]} strong={index === last}>
                {value}
              </Cell>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** One list of a panel; a panel with several shows them as tabs. */
export type ListTab = { key: string; label: string; columns: Column[]; rows: TableRow[]; empty?: string };

/** A card holding one list -- or several, as tabs -- with its column names over the numbers. */
export function ListPanel({
  tabs,
  note,
  more,
  footnote,
  children,
  className,
}: {
  tabs: ListTab[];
  note?: string;
  more?: More;
  footnote?: string;
  /** Under the list: a line the list itself cannot show. */
  children?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(tabs[0].key);
  const tab = tabs.find((each) => each.key === open) ?? tabs[0];
  // Three tabs and the column names do not share a line in half a page.
  const stacked = tabs.length > 2;
  return (
    <section className={cn(CARD, "flex min-w-0 flex-col gap-2 px-4 pb-4 pt-3 sm:px-5 lg:px-6", className)}>
      <div
        className={cn(
          "flex flex-col gap-2 border-b border-border pb-2.5",
          !stacked && "sm:flex-row sm:items-end sm:justify-between",
        )}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          {tabs.length > 1 ? (
            <div className="flex min-h-8 flex-wrap items-center gap-x-4 gap-y-1">
              {tabs.map((each) => (
                <button
                  key={each.key}
                  type="button"
                  aria-pressed={each.key === tab.key}
                  onClick={() => setOpen(each.key)}
                  className={cn(
                    "rounded-ui text-sm",
                    each.key === tab.key ? "font-semibold text-foreground" : "font-medium text-muted-foreground hover:text-foreground",
                  )}
                >
                  {each.label}
                </button>
              ))}
            </div>
          ) : (
            <h2 className="flex min-h-8 items-center text-[15px] font-semibold text-foreground">{tab.label}</h2>
          )}
          {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
        </div>
        {tab.rows.length ? (
          <div className="flex shrink-0 justify-end pr-2.5 text-xs text-muted-foreground">
            {tab.columns.map((column) => (
              <Cell key={column.label} column={column}>
                {column.label}
              </Cell>
            ))}
          </div>
        ) : null}
      </div>
      <BarTable columns={tab.columns} rows={tab.rows} empty={tab.empty} />
      {children}
      {footnote ? <p className="text-[11px] text-muted-foreground">{footnote}</p> : null}
      {more ? (
        <div className="mt-auto pt-1">
          <MoreLink more={more} />
        </div>
      ) : null}
    </section>
  );
}

export function Empty({ children }: { children?: ReactNode }) {
  const t = useTranslations("analyticsPage");
  return <p className="py-6 text-center text-sm text-muted-foreground">{children ?? t("nothingYet")}</p>;
}

const CURRENT = "hsl(var(--accent-blue))";
const PREVIOUS = "hsl(var(--muted-foreground))";

/** The chart's key: the solid line is these days, the dashed one the days they are compared with. */
export function ChartLegend({ period }: { period: PeriodInfo }) {
  const { format } = useAnalyticsView();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-0.5 w-3.5 rounded-full" style={{ background: CURRENT }} aria-hidden />
        {format.days(period.start_date, period.end_date)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3.5 border-t-2 border-dashed" style={{ borderColor: PREVIOUS }} aria-hidden />
        {format.days(period.compare_start_date, period.compare_end_date)}
      </span>
    </div>
  );
}

/**
 * A number over the period against the compared days: the period's line solid
 * over a soft fill, the compared one dashed. Pointing at a day shows both, and
 * how far it moved.
 */
export function TrendChart({
  points,
  period,
  show,
  axis,
  unit = "percent",
}: {
  points: ChartPoint[];
  period: PeriodInfo;
  /** How a value is written when a day is pointed at. */
  show: (n: number) => string;
  /** How a value is written on the side of the chart. */
  axis: (n: number) => string;
  /** How a day's move reads: a percentage, or -- a rate -- points. */
  unit?: "percent" | "points";
}) {
  const t = useTranslations("analyticsPage");
  const { format } = useAnalyticsView();
  const fill = `fill-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const hourly = period.start_date === period.end_date;
  const when = (date: string) => (hourly ? format.hour(date) : format.dayName(date));

  return (
    <RechartsSizedContainer className="h-52 w-full lg:h-72" style={{ minHeight: 208 }}>
      {({ width, height }) => (
        <ResponsiveContainer width={width} height={height} minWidth={0}>
          <AreaChart data={points} margin={{ top: 8, left: 0, right: 8, bottom: 0 }}>
            <defs>
              <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CURRENT} stopOpacity={0.18} />
                <stop offset="100%" stopColor={CURRENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              interval="preserveStartEnd"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={(v) => (hourly ? format.hour(String(v)) : format.day(String(v)))}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              allowDecimals={unit === "points"}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={(v) => axis(Number(v))}
            />
            <Tooltip
              cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "4 4" }}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as ChartPoint | undefined;
                if (!active || !point) return null;
                const change = changeOf(point.current, point.previous, unit);
                return (
                  <div className="flex min-w-44 flex-col gap-1.5 rounded-ui border border-border bg-card px-3 py-2.5 text-xs [box-shadow:var(--shadow-popover)]">
                    <span className="font-medium text-muted-foreground">{when(point.date)}</span>
                    <span className="flex items-center justify-between gap-4 text-sm font-semibold text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-0.5 w-2.5 rounded-full" style={{ background: CURRENT }} aria-hidden />
                        {show(point.current)}
                      </span>
                      {change ? (
                        <span className={cn("text-xs", change > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>
                          {change > 0 ? "+" : "−"}
                          {unit === "points" ? t("points", { n: format.decimal(Math.abs(change)) }) : format.percent(Math.abs(change))}
                        </span>
                      ) : null}
                    </span>
                    {point.previous !== null && point.previousDate ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="w-2.5 border-t-2 border-dashed" style={{ borderColor: PREVIOUS }} aria-hidden />
                        {when(point.previousDate)} · {show(point.previous)}
                      </span>
                    ) : null}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="previous"
              stroke={PREVIOUS}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              fill="none"
              dot={false}
              activeDot={{ r: 3.5, fill: "hsl(var(--card))", stroke: PREVIOUS, strokeWidth: 1.5 }}
            />
            <Area
              type="monotone"
              dataKey="current"
              stroke={CURRENT}
              strokeWidth={2.25}
              fill={`url(#${fill})`}
              dot={false}
              activeDot={{ r: 5, fill: "hsl(var(--card))", stroke: CURRENT, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </RechartsSizedContainer>
  );
}

export { shareOf } from "../_lib/insights";
