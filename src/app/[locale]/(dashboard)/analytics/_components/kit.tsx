"use client";

import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Info, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { RechartsSizedContainer } from "@/components/RechartsSizedContainer";
import { Tooltip as HintTip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { useAnalyticsView } from "../_lib/context";
import type { Card, SectionKey } from "../_lib/types";

/**
 * The pieces every section of the analytics page is built from, drawn to the
 * approved design (phone first): panels, headline cards, bar lists, a trend
 * line against the compared days.
 */

export function Panel({
  title,
  note,
  more,
  children,
  className,
}: {
  title: string;
  note?: string;
  /** Another section this panel is a glimpse of. */
  more?: { section: SectionKey; label: string };
  children: ReactNode;
  className?: string;
}) {
  const { goTo } = useAnalyticsView();
  return (
    <section className={cn("flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-3.5", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
          {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
        </div>
        {more ? (
          <button
            type="button"
            onClick={() => goTo(more.section)}
            className="inline-flex shrink-0 items-center gap-0.5 rounded-ui text-xs font-medium text-primary hover:underline"
          >
            {more.label}
            <ChevronRight className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">{children}</div>;
}

/** How far a headline number moved, and whether that is good news. */
export function Change({
  card,
  lowerIsBetter = false,
  plain,
}: {
  card: Card<number | string>;
  lowerIsBetter?: boolean;
  /** How a `plain` change is written (days, pieces). */
  plain?: (n: number) => string;
}) {
  const t = useTranslations("analyticsPage");
  const { format, compare } = useAnalyticsView();
  const against = compare === "year" ? t("vsLastYear") : t("vsPrevious");
  if (card.change === null || Number.isNaN(card.change)) {
    return <p className="text-xs text-muted-foreground">— {against}</p>;
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
    <p className="flex items-center gap-1 text-xs">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-medium",
          good === null ? "text-muted-foreground" : good ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400",
        )}
      >
        {card.change === 0 ? null : <Arrow className="size-3.5" aria-hidden />}
        {text}
      </span>
      <span className="text-muted-foreground">{against}</span>
    </p>
  );
}

export function StatCard({
  label,
  hint,
  value,
  card,
  lowerIsBetter,
  plain,
}: {
  label: string;
  /** What the number counts, in one line. */
  hint?: string;
  value: string;
  card: Card<number | string>;
  lowerIsBetter?: boolean;
  plain?: (n: number) => string;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-1.5 rounded-card border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-1.5">
        <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
        {hint ? (
          <HintTip delayDuration={150}>
            <TooltipTrigger asChild>
              <button type="button" aria-label={hint} className="inline-flex shrink-0 text-muted-foreground">
                <Info className="size-3.5" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" variant="light" className="max-w-64">
              <p className="leading-relaxed">{hint}</p>
            </TooltipContent>
          </HintTip>
        ) : null}
      </div>
      <div className="truncate text-xl font-semibold tracking-tight text-foreground tabular-nums">{value}</div>
      <Change card={card} lowerIsBetter={lowerIsBetter} plain={plain} />
    </section>
  );
}

export type BarRow = {
  key: string;
  label: ReactNode;
  detail?: ReactNode;
  value: ReactNode;
  /** How full the bar is, 0-100. */
  share: number;
};

/** Named rows, each with its number and a bar for how big it is beside the rest. */
export function BarList({ rows, empty }: { rows: BarRow[]; empty?: string }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.key} className="flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-foreground">{row.label}</span>
              {row.detail ? <span className="text-xs text-muted-foreground">{row.detail}</span> : null}
            </div>
            <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">{row.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, row.share))}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Empty({ children }: { children?: ReactNode }) {
  const t = useTranslations("analyticsPage");
  return <p className="py-4 text-center text-sm text-muted-foreground">{children ?? t("nothingYet")}</p>;
}

/** A Premium part of the page, on a Basic plan. */
export function Upgrade({ title }: { title: string }) {
  const t = useTranslations("analyticsPage");
  return (
    <section className="flex flex-col items-start gap-2 rounded-card border border-dashed border-border bg-card p-4">
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
        <Lock className="size-4" aria-hidden />
        {title}
      </span>
      <p className="text-sm text-muted-foreground">{t("upgradeBody")}</p>
      <Link href="/plans" className="text-sm font-medium text-primary hover:underline">
        {t("upgradeAction")}
      </Link>
    </section>
  );
}

const CURRENT = "hsl(var(--accent-blue))";
const PREVIOUS = "hsl(var(--muted-foreground))";

/**
 * A number over the period against the compared days: the period's line
 * solid, the compared one dashed, drawn on the period's own dates.
 */
export function TrendChart<P extends { date: string }>({
  data,
  comparison,
  value,
  hourly,
  show,
  labels,
}: {
  data: P[];
  comparison: P[];
  value: (point: P) => number;
  hourly: boolean;
  /** How a value is written in the tooltip. */
  show: (n: number) => string;
  labels: { current: string; previous: string };
}) {
  const { format } = useAnalyticsView();
  const points = data.map((point, index) => ({
    date: point.date,
    current: value(point),
    previous: comparison[index] ? value(comparison[index]) : null,
  }));
  const axis = (date: string) => (hourly ? format.hour(date) : format.day(date));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: CURRENT }} />
          {labels.current}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0 w-4 border-t border-dashed" style={{ borderColor: PREVIOUS }} />
          {labels.previous}
        </span>
      </div>
      <RechartsSizedContainer className="h-44 w-full lg:h-60" style={{ minHeight: 176 }}>
        {({ width, height }) => (
          <ResponsiveContainer width={width} height={height} minWidth={0}>
            <LineChart data={points} margin={{ top: 6, left: 0, right: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                minTickGap={24}
                interval="preserveStartEnd"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(v) => axis(String(v))}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                allowDecimals={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(v) => format.digits(Intl.NumberFormat("en", { notation: "compact" }).format(Number(v)))}
              />
              <Tooltip
                contentStyle={{
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                  backgroundColor: "hsl(var(--card))",
                  color: "hsl(var(--foreground))",
                }}
                labelFormatter={(l) => axis(String(l))}
                formatter={(v, name) => [show(Number(v)), name === "current" ? labels.current : labels.previous]}
              />
              <Line type="monotone" dataKey="previous" stroke={PREVIOUS} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="current" stroke={CURRENT} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </RechartsSizedContainer>
    </div>
  );
}

export { shareOf } from "../_lib/insights";
