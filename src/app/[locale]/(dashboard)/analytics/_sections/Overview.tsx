"use client";

import { type ReactNode, useState } from "react";
import { MapPin, TrendingUp, TriangleAlert, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import {
  CARD,
  Change,
  ChartLegend,
  type Column,
  ListPanel,
  type More,
  MoreLink,
  StatLabel,
  TrendChart,
  shareOf,
} from "../_components/kit";
import { Locked, UnlockCard } from "../_components/PremiumLock";
import { SAMPLE_PARCELS } from "../_lib/samples";
import { useAnalyticsView } from "../_lib/context";
import { type Metric, changeOf, metricPoints } from "../_lib/insights";
import { pageName, sourceName } from "../_lib/names";
import { dayCount } from "../_lib/period";
import type { Card, OverviewReport, SectionKey } from "../_lib/types";

/** How many rows each list shows before its own section. */
const ROWS = 5;

const PARCEL_ROWS = ["delivered", "partial", "returned", "in_transit", "not_dispatched", "unknown"] as const;

/**
 * The Overview, story first: the days in one sentence, the four numbers (each
 * opens its line on the chart), what moved them, what needs a look -- then the
 * details, each a glimpse of its own section.
 */
export function Overview({ report }: { report: OverviewReport }) {
  const t = useTranslations("analyticsPage");
  const { full } = useAnalyticsView();

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <Story report={report} />
      <WhatMovedIt report={report} />
      <NeedsALook report={report} />
      <section className="flex flex-col gap-3">
        <h2 className="pt-1 text-[15px] font-semibold text-foreground">{t("overview.details")}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {full ? (
            <>
              <Sources report={report} />
              <Places report={report} />
              <ProductsList report={report} />
              <Journey report={report} />
            </>
          ) : null}
          <Stand report={report} />
          {full ? (
            <DeliveryList report={report} />
          ) : (
            // Premium: the real list, drawn from made-up parcels and blurred (PremiumLock).
            <Locked compact card={<UnlockCard compact line={t("premium.lines.overviewDelivery")} />}>
              <DeliveryList report={{ ...report, parcels: SAMPLE_PARCELS }} />
            </Locked>
          )}
        </div>
      </section>
    </div>
  );
}

type Shown = {
  key: Metric;
  label: string;
  hint: string;
  card: Card<number | string>;
  show: (value: number | string) => string;
  axis: (n: number) => string;
  unit: "percent" | "points";
};

function Story({ report }: { report: OverviewReport }) {
  const t = useTranslations("analyticsPage");
  const { format } = useAnalyticsView();
  const { cards, period } = report;
  const [metric, setMetric] = useState<Metric>("sales");
  const count = (value: number | string) => format.count(Number(value));
  const metrics: Shown[] = [
    { key: "sales" as const, label: t("cards.sales"), hint: t("cards.salesHint"), card: cards.sales, show: (v: number | string) => format.money(v), axis: format.moneyCompact, unit: "percent" as const },
    { key: "orders" as const, label: t("cards.orders"), hint: t("cards.ordersHint"), card: cards.orders, show: count, axis: format.compact, unit: "percent" as const },
    ...(cards.visitors && cards.conversion
      ? [
          { key: "visitors" as const, label: t("cards.visitors"), hint: t("cards.visitorsHint"), card: cards.visitors, show: count, axis: format.compact, unit: "percent" as const },
          {
            key: "conversion" as const,
            label: t("cards.conversion"),
            hint: t("cards.conversionHint"),
            card: cards.conversion,
            show: (v: number | string) => format.percent(Number(v)),
            axis: (n: number) => format.percent(n),
            unit: "points" as const,
          },
        ]
      : []),
  ];
  const shown = metrics.find((each) => each.key === metric) ?? metrics[0];
  const by = period.start_date === period.end_date ? "hour" : "day";

  return (
    <section className={cn(CARD, "flex flex-col overflow-hidden")}>
      <div className="flex flex-col gap-2.5 p-4 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
        <p className="text-xs font-medium text-muted-foreground">
          {t("overview.story.when", {
            days: format.days(period.start_date, period.end_date),
            before: format.days(period.compare_start_date, period.compare_end_date),
          })}
        </p>
        <Headline report={report} />
      </div>
      <div
        role="tablist"
        aria-label={t("overview.story.numbers")}
        className={cn("grid grid-cols-2 border-t border-border", metrics.length === 4 && "lg:grid-cols-4")}
      >
        {metrics.map((each, index) => (
          <MetricTab
            key={each.key}
            metric={each}
            active={each.key === shown.key}
            index={index}
            count={metrics.length}
            onSelect={() => setMetric(each.key)}
          />
        ))}
      </div>
      <div role="tabpanel" className="flex flex-col gap-3 px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-5 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
          <h2 className="text-sm font-semibold text-foreground">
            {shown.key === "sales"
              ? t("chart.sales", { by })
              : shown.key === "orders"
                ? t("chart.orders", { by })
                : shown.key === "visitors"
                  ? t("chart.visitors", { by })
                  : t("chart.conversion", { by })}
          </h2>
          <ChartLegend period={period} />
        </div>
        <TrendChart
          points={metricPoints(report.series, shown.key)}
          period={period}
          show={(n) => shown.show(n)}
          axis={shown.axis}
          unit={shown.unit}
        />
      </div>
    </section>
  );
}

/** One of the headline numbers; choosing it puts its line on the chart. */
function MetricTab({
  metric,
  active,
  index,
  count,
  onSelect,
}: {
  metric: Shown;
  active: boolean;
  index: number;
  count: number;
  onSelect: () => void;
}) {
  // Hairlines between the numbers: two to a row on a phone, all four in one on a computer.
  const right = cn(index % 2 === 0 && "border-r", count === 4 && index === 1 && "lg:border-r");
  const bottom = active ? (count === 4 && index < 2 ? "lg:border-b-transparent" : "border-b-transparent") : "";
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col gap-1 border-b border-border px-4 py-3.5 sm:px-5 sm:py-4 lg:px-6",
        right,
        bottom,
        active ? "bg-card shadow-[inset_0_2px_0_hsl(var(--accent-blue))]" : "bg-muted/50 hover:bg-muted",
      )}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active}
        aria-label={metric.label}
        onClick={onSelect}
        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      />
      <span className="pointer-events-none relative flex">
        <span className="pointer-events-auto flex min-w-0">
          <StatLabel label={metric.label} hint={metric.hint} strong={active} />
        </span>
      </span>
      <span className="pointer-events-none relative truncate text-xl font-semibold tracking-tight text-foreground tabular-nums sm:text-2xl">
        {metric.card.value === null ? "—" : metric.show(metric.card.value)}
      </span>
      <div className="pointer-events-none relative">
        <Change card={metric.card} show={metric.show} />
      </div>
    </div>
  );
}

/** The days in one sentence: what the shop made, and how that compares. */
function Headline({ report }: { report: OverviewReport }) {
  const t = useTranslations("analyticsPage");
  const { format, compare } = useAnalyticsView();
  const { cards, period } = report;
  const orders = Number(cards.orders.value ?? 0);
  const className = "max-w-3xl text-balance text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-[26px] lg:text-[28px]";
  if (!orders) return <p className={className}>{t("overview.story.none")}</p>;

  const days = dayCount(period.start_date, period.end_date);
  const before =
    compare === "year"
      ? t("overview.story.lastYear")
      : days === 1
        ? t("overview.story.dayBefore")
        : period.preset === "month"
          ? t("overview.story.lastMonth")
          : t("overview.story.daysBefore", { n: format.count(days) });
  const words = { sales: format.money(cards.sales.value), orders: format.count(orders), count: orders, before };
  const change = cards.sales.change;
  const up = (chunks: ReactNode) => <span className="text-emerald-700 dark:text-emerald-400">{chunks}</span>;
  const down = (chunks: ReactNode) => <span className="text-rose-700 dark:text-rose-400">{chunks}</span>;

  return (
    <p className={className}>
      {change === null
        ? t("overview.story.plain", words)
        : change > 0
          ? t.rich("overview.story.up", { ...words, change: format.percent(change), up })
          : change < 0
            ? t.rich("overview.story.down", { ...words, change: format.percent(-change), down })
            : t("overview.story.same", words)}
    </p>
  );
}

type Note = { key: string; section: SectionKey; icon: typeof Users; text: ReactNode };

/** What moved the numbers, as the API found it (analytics/story.py). */
function WhatMovedIt({ report }: { report: OverviewReport }) {
  const t = useTranslations("analyticsPage");
  const locale = useLocale();
  const { format } = useAnalyticsView();
  const b = (chunks: ReactNode) => <strong className="font-semibold text-foreground">{chunks}</strong>;
  const named = (row: { name: string; name_bn: string }) => (locale === "bn" ? row.name_bn : row.name);
  const { top_source: source, best_day: best, places } = report.notes;
  const notes: Note[] = [];

  if (source) {
    notes.push({
      key: "source",
      section: "traffic",
      icon: Users,
      text: t.rich("overview.moved.source", {
        source: sourceName(source.source, t),
        orders: format.count(source.orders),
        total: format.count(Number(report.cards.orders.value ?? 0)),
        sales: format.money(source.sales),
        b,
      }),
    });
  }

  if (best) {
    const sales = format.money(best.sales);
    const hourly = report.period.start_date === report.period.end_date;
    const was = Number(best.was_sales ?? 0);
    const change = best.was_date && was ? changeOf(Number(best.sales), was, "percent") : null;
    const words = { day: format.dayName(best.date), sales, b };
    notes.push({
      key: "day",
      section: "sales",
      icon: TrendingUp,
      text: hourly
        ? t.rich("overview.moved.bestHour", { hour: format.hour(best.date), sales, b })
        : change && best.was_date
          ? change > 0
            ? t.rich("overview.moved.bestDayUp", { ...words, change: format.percent(change), before: format.dayName(best.was_date) })
            : t.rich("overview.moved.bestDayDown", { ...words, change: format.percent(-change), before: format.dayName(best.was_date) })
          : t.rich("overview.moved.bestDay", words),
    });
  }

  if (places) {
    notes.push({
      key: "places",
      section: "districts",
      icon: MapPin,
      text: (
        <>
          {t.rich("overview.moved.placesMost", {
            district: named(places.most),
            orders: t("orderCount", { n: format.count(places.most.orders) }),
            b,
          })}
          {places.lowest ? " " : null}
          {places.lowest
            ? t.rich("overview.moved.placesLowest", {
                district: named(places.lowest),
                rate: format.percent(places.lowest.delivered_rate),
                b,
              })
            : null}
        </>
      ),
    });
  }

  if (!notes.length) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[15px] font-semibold text-foreground">{t("overview.moved.title")}</h2>
      <div className={cn("grid gap-3 sm:gap-4", notes.length === 3 ? "md:grid-cols-3" : notes.length === 2 && "md:grid-cols-2")}>
        {notes.map((note) => (
          <article key={note.key} className={cn(CARD, "flex flex-col gap-3 p-4 sm:p-5")}>
            <span className="flex items-center gap-2.5 text-xs font-medium text-muted-foreground">
              <span className="grid size-8 place-items-center rounded-ui bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400">
                <note.icon className="size-4" aria-hidden />
              </span>
              {t(`sections.${note.section}`)}
            </span>
            <p className="flex-1 text-[15px] leading-relaxed text-foreground/80">{note.text}</p>
            <MoreLink more={{ section: note.section, label: t("overview.moved.open", { section: t(`sections.${note.section}`) }) }} />
          </article>
        ))}
      </div>
    </section>
  );
}

/** Orders that are stuck: placed and never confirmed, or confirmed and not delivered yet. */
function NeedsALook({ report }: { report: OverviewReport }) {
  const t = useTranslations("analyticsPage");
  const { format, full } = useAnalyticsView();
  const { steps } = report;
  const b = (chunks: ReactNode) => <strong className="font-semibold text-amber-800 dark:text-amber-400">{chunks}</strong>;
  const orders: More = { href: "/orders", label: t("overview.look.openOrders") };
  const rows: { key: string; text: ReactNode; more: More }[] = [];
  if (steps.not_confirmed) {
    rows.push({
      key: "notConfirmed",
      text: t.rich("overview.look.notConfirmed", { orders: t("orderCount", { n: format.count(steps.not_confirmed) }), b }),
      more: orders,
    });
  }
  if (steps.not_delivered) {
    rows.push({
      key: "notDelivered",
      text: t.rich("overview.look.notDelivered", { orders: t("orderCount", { n: format.count(steps.not_delivered) }), b }),
      more: full ? { section: "delivery", label: t("overview.look.openDelivery") } : orders,
    });
  }
  if (!rows.length) return null;

  return (
    <section className="flex flex-col rounded-card border border-amber-200 bg-amber-50 px-4 pb-1 pt-3.5 sm:px-6 dark:border-amber-900/60 dark:bg-amber-950/30">
      <h2 className="pb-2.5 text-[15px] font-semibold text-foreground">{t("overview.look.title")}</h2>
      {rows.map((row) => (
        <div
          key={row.key}
          className="flex flex-col items-start gap-2 border-t border-amber-200 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 dark:border-amber-900/60"
        >
          <p className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/80">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            <span>{row.text}</span>
          </p>
          <MoreLink more={row.more} />
        </div>
      ))}
    </section>
  );
}

function Sources({ report }: { report: OverviewReport }) {
  const t = useTranslations("analyticsPage");
  const { format } = useAnalyticsView();
  const sources = (report.sources ?? []).slice(0, ROWS);
  const campaigns = report.campaigns ?? [];
  const landing = report.landing ?? [];
  const bought: Column[] = [{ label: t("columns.visitors"), wide: true }, { label: t("columns.orders") }, { label: t("columns.sales") }];
  const most = (rows: { visitors: number }[]) => Math.max(...rows.map((row) => row.visitors), 0);
  return (
    <ListPanel
      more={{ section: "traffic", label: t("sections.traffic") }}
      tabs={[
        {
          key: "sources",
          label: t("overview.lists.sources"),
          columns: bought,
          rows: sources.map((row) => ({
            key: row.source,
            label: sourceName(row.source, t),
            values: [format.count(row.visitors), format.count(row.orders), format.money(row.sales)],
            share: shareOf(row.visitors, most(sources)),
          })),
        },
        {
          key: "campaigns",
          label: t("overview.lists.campaigns"),
          columns: bought,
          empty: t("traffic.noCampaigns"),
          rows: campaigns.map((row) => ({
            key: row.campaign,
            label: row.campaign,
            values: [format.count(row.visitors), format.count(row.orders), format.money(row.sales)],
            share: shareOf(row.visitors, most(campaigns)),
          })),
        },
        {
          key: "landing",
          label: t("overview.lists.landing"),
          columns: [{ label: t("columns.visitors") }, { label: t("columns.stayOn"), wide: true }, { label: t("columns.buy") }],
          rows: landing.map((row) => ({
            key: row.path,
            label: pageName(row, t),
            values: [format.count(row.visitors), format.percent(row.engaged_rate), format.percent(row.conversion)],
            share: shareOf(row.visitors, most(landing)),
          })),
        },
      ]}
    />
  );
}

function Places({ report }: { report: OverviewReport }) {
  const t = useTranslations("analyticsPage");
  const locale = useLocale();
  const { format } = useAnalyticsView();
  const named = (row: { name: string; name_bn: string }) => (locale === "bn" ? row.name_bn : row.name);
  const districts = (report.districts ?? []).slice(0, ROWS);
  const divisions = (report.divisions ?? []).filter((row) => row.orders).sort((a, b) => b.orders - a.orders);
  const columns: Column[] = [{ label: t("columns.orders") }, { label: t("columns.sales") }, { label: t("columns.delivered"), wide: true }];
  const rows = (list: { key: string; name: string; name_bn: string; orders: number; sales: string; delivered_rate: number }[]) => {
    const most = Math.max(...list.map((row) => row.orders), 0);
    return list.map((row) => ({
      key: row.key,
      label: named(row),
      values: [format.count(row.orders), format.money(row.sales), format.percent(row.delivered_rate)],
      share: shareOf(row.orders, most),
    }));
  };
  return (
    <ListPanel
      more={{ section: "districts", label: t("sections.districts") }}
      tabs={[
        { key: "districts", label: t("overview.lists.districts"), columns, rows: rows(districts) },
        { key: "divisions", label: t("overview.lists.divisions"), columns, rows: rows(divisions) },
      ]}
    />
  );
}

function ProductsList({ report }: { report: OverviewReport }) {
  const t = useTranslations("analyticsPage");
  const { format } = useAnalyticsView();
  const products = report.best_sellers ?? [];
  const categories = report.categories ?? [];
  const most = Math.max(...products.map((row) => Number(row.revenue)), 0);
  return (
    <ListPanel
      more={{ section: "products", label: t("sections.products") }}
      tabs={[
        {
          key: "products",
          label: t("overview.lists.products"),
          columns: [{ label: t("columns.views"), wide: true }, { label: t("columns.sold") }, { label: t("columns.sales") }],
          rows: products.map((row) => ({
            key: row.product_id,
            label: row.product_name,
            values: [format.count(row.views), format.count(row.units), format.money(row.revenue)],
            share: shareOf(Number(row.revenue), most),
          })),
        },
        {
          key: "categories",
          label: t("overview.lists.categories"),
          columns: [{ label: t("columns.share") }, { label: t("columns.sales") }],
          rows: categories.map((row) => ({
            key: row.category || "none",
            label: row.category || t("products.noCategory"),
            values: [format.percent(row.share), format.money(row.sales)],
            share: row.share,
          })),
        },
      ]}
    />
  );
}

function Journey({ report }: { report: OverviewReport }) {
  const t = useTranslations("analyticsPage");
  const { format } = useAnalyticsView();
  const journey = report.journey;
  if (!journey) return null;
  const steps = [
    { key: "visitors", n: journey.visitors, of: null },
    { key: "viewed_product", n: journey.viewed_product, of: journey.visitors },
    { key: "added_to_cart", n: journey.added_to_cart, of: journey.viewed_product },
    { key: "started_checkout", n: journey.started_checkout, of: journey.added_to_cart },
    { key: "placed", n: journey.placed, of: journey.started_checkout },
    { key: "confirmed", n: journey.confirmed, of: journey.placed },
  ] as const;
  return (
    <ListPanel
      note={t("overview.journeyNote")}
      footnote={journey.visitors ? t("overview.journeyFootnote") : undefined}
      tabs={[
        {
          key: "journey",
          label: t("overview.journeyTitle"),
          columns: [{ label: t("columns.ofStepBefore"), wide: true, width: "w-28 sm:w-32" }, { label: t("columns.shoppers") }],
          empty: t("overview.journeyEmpty"),
          rows: journey.visitors
            ? steps.map((step) => ({
                key: step.key,
                label: t(`overview.journey.${step.key}`),
                values: [step.of === null ? format.percent(100) : step.of ? format.percent(shareOf(step.n, step.of)) : "—", format.count(step.n)],
                share: Math.min(100, shareOf(step.n, journey.visitors)),
              }))
            : [],
        },
      ]}
    />
  );
}

function Stand({ report }: { report: OverviewReport }) {
  const t = useTranslations("analyticsPage");
  const { format } = useAnalyticsView();
  const { steps } = report;
  const placed = Number(steps.placed.sales);
  const stages = [
    { key: "placed", label: t("overview.placed"), stage: steps.placed },
    { key: "confirmed", label: t("overview.confirmed"), stage: steps.confirmed },
    { key: "delivered", label: t("overview.delivered"), stage: steps.delivered },
  ];
  return (
    <ListPanel
      note={t("overview.stepsNote")}
      more={{ href: "/orders", label: t("overview.look.openOrders") }}
      tabs={[
        {
          key: "stand",
          label: t("overview.stepsTitle"),
          columns: [{ label: t("columns.orders") }, { label: t("columns.sales") }],
          rows: steps.placed.orders
            ? stages.map((row) => ({
                key: row.key,
                label: row.label,
                values: [format.count(row.stage.orders), format.money(row.stage.sales)],
                share: shareOf(Number(row.stage.sales), placed),
              }))
            : [],
        },
      ]}
    />
  );
}

function DeliveryList({ report }: { report: OverviewReport }) {
  const t = useTranslations("analyticsPage");
  const { format } = useAnalyticsView();
  const parcels = report.parcels;
  if (!parcels) return null;
  const sent = PARCEL_ROWS.reduce((sum, key) => sum + parcels[key], 0);
  return (
    <ListPanel
      note={t("delivery.parcelsNote", { n: format.count(sent) })}
      more={{ section: "delivery", label: t("sections.delivery") }}
      tabs={[
        {
          key: "delivery",
          label: t("overview.deliveryTitle"),
          columns: [{ label: t("columns.share") }, { label: t("columns.parcels") }],
          rows: PARCEL_ROWS.filter((key) => parcels[key]).map((key) => ({
            key,
            label: t(`overview.parcels.${key}`),
            values: [format.percent(shareOf(parcels[key], sent)), format.count(parcels[key])],
            share: shareOf(parcels[key], sent),
          })),
        },
      ]}
    />
  );
}
