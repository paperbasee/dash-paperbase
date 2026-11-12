"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { AnalyticsBucket, DashboardAnalyticsPoint, DashboardAnalyticsSummary } from "@/lib/basicAnalyticsService";
import type { HomeNumbers, WaitingStep } from "@/lib/dashboard/home";
import { toLocaleDigits } from "@/lib/locale-digits";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;
const DHAKA = "Asia/Dhaka";

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
 * The home page's top panel: the orders placed in the period the switch picks, split by where
 * they stand, with orders per bucket beside them; under a hairline, where every order is now.
 */
export function HomeOrdersPanel({ summary, previousOrders, series, bucket, flow, now }: HomeOrdersPanelProps) {
  return (
    <section className="overflow-hidden rounded-card border border-card-border bg-card">
      <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <PeriodSummary summary={summary} previousOrders={previousOrders} />
        <OrderBars series={series} bucket={bucket} />
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
    <div className="flex flex-col justify-between gap-6 border-b border-border-subtle px-5 py-5 sm:px-7 sm:py-6 md:border-b-0 md:border-r">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{t("orders")}</h2>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
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
      </div>
      <div>
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          {parts.map((part) => (
            <div key={part.key} className="flex flex-col gap-0.5">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("size-2 rounded-[2px]", part.swatch)} aria-hidden />
                {part.label}
              </dt>
              <dd className={cn("text-xl font-semibold tracking-tight text-foreground", numbers)}>
                {part.value === undefined ? "—" : digits(part.value)}
              </dd>
            </div>
          ))}
        </dl>
        {summary && summary.orders > 0 ? (
          <div className="mt-3.5 flex h-1 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            <span className="bg-foreground" style={{ flex: summary.confirmed }} />
            <span className="bg-foreground/35" style={{ flex: summary.pending }} />
            <span className="bg-rose-500" style={{ flex: summary.cancelled }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Ticks under the bars: the first, three between, and the last bucket. */
function tickIndexes(length: number): number[] {
  if (length <= 1) return length === 1 ? [0] : [];
  const picks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (length - 1)));
  return [...new Set(picks)];
}

function OrderBars({ series, bucket }: Pick<HomeOrdersPanelProps, "series" | "bucket">) {
  const format = useFormatter();
  const locale = useLocale();
  const t = useTranslations("dashboard.home");
  const max = Math.max(1, ...series.map((point) => point.orders));
  const lastIndex = series.length - 1;

  const label = (raw: string) => {
    const at = new Date(raw);
    if (Number.isNaN(at.getTime())) return raw;
    if (bucket === "minute") return format.dateTime(at, { hour: "numeric", minute: "2-digit", timeZone: DHAKA });
    if (bucket === "hour") return format.dateTime(at, { hour: "numeric", timeZone: DHAKA });
    if (bucket === "month") return format.dateTime(at, { month: "short", timeZone: DHAKA });
    return format.dateTime(at, { day: "numeric", month: "short", timeZone: DHAKA });
  };
  const ticks = tickIndexes(series.length);

  return (
    <div className="flex min-w-0 flex-col gap-3 px-5 pb-4 pt-6 sm:px-7">
      <div
        className="relative grid h-24 items-end border-b border-border-subtle sm:h-32"
        style={{ gridTemplateColumns: `repeat(${Math.max(series.length, 1)}, minmax(0, 1fr))`, gap: series.length > 40 ? 1 : 4 }}
        role="img"
        aria-label={t("barsAria")}
      >
        <span className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border-subtle" aria-hidden />
        <span className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-border-subtle" aria-hidden />
        {series.map((point, i) => {
          const last = i === lastIndex;
          return (
            <span
              key={point.label}
              className={cn(
                "relative z-[1] block min-h-[2px] rounded-t-[2px]",
                last ? "bg-[hsl(var(--accent-blue))]" : "bg-foreground/15"
              )}
              style={{ height: point.orders ? `${Math.max(5, Math.round((point.orders / max) * 90))}%` : 0 }}
              title={`${label(point.label)}: ${toLocaleDigits(String(point.orders), locale)}`}
            >
              {last && point.orders > 0 ? (
                <span className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 text-[11px] font-semibold text-[hsl(var(--accent-blue))]">
                  {toLocaleDigits(String(point.orders), locale)}
                </span>
              ) : null}
            </span>
          );
        })}
      </div>
      <div className="flex justify-between gap-2 whitespace-nowrap text-[11px] text-muted-foreground">
        {ticks.map((i) => (
          <span key={i} className={cn(i === lastIndex && "font-medium text-foreground")}>
            {label(series[i].label)}
          </span>
        ))}
      </div>
    </div>
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
    // The hairlines between the cells are the panel's border colour showing through a 1px gap,
    // so they sit right at two, three and six cells a row alike.
    <div className="grid grid-cols-2 gap-px border-t border-border-subtle bg-border-subtle sm:grid-cols-3 xl:grid-cols-6">
      {cells.map((cell) => (
        <Link
          key={cell.key}
          href={cell.href}
          className="flex min-w-0 flex-col gap-1.5 bg-card px-4 pb-5 pt-4 transition-colors hover:bg-muted/40 sm:px-5"
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
