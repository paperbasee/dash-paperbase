"use client";

import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { BarList, Empty, Panel, StatCard, StatGrid, TrendChart, Upgrade, shareOf } from "../_components/kit";
import { useAnalyticsView } from "../_lib/context";
import { sourceName } from "../_lib/names";
import { useLive } from "../_lib/queries";
import type { OverviewReport } from "../_lib/types";

export function Overview({ report }: { report: OverviewReport }) {
  const t = useTranslations("analyticsPage");
  const { format, full } = useAnalyticsView();
  const { cards, steps } = report;

  return (
    <div className="flex flex-col gap-3">
      {full ? <LiveStrip /> : null}
      <StatGrid>
        <StatCard label={t("cards.sales")} hint={t("cards.salesHint")} value={format.money(cards.sales.value)} card={cards.sales} />
        <StatCard label={t("cards.orders")} hint={t("cards.ordersHint")} value={format.count(Number(cards.orders.value))} card={cards.orders} />
        {cards.visitors && cards.conversion ? (
          <>
            <StatCard
              label={t("cards.visitors")}
              hint={t("cards.visitorsHint")}
              value={format.count(Number(cards.visitors.value))}
              card={cards.visitors}
            />
            <StatCard
              label={t("cards.conversion")}
              hint={t("cards.conversionHint")}
              value={format.percent(Number(cards.conversion.value))}
              card={cards.conversion}
            />
          </>
        ) : null}
      </StatGrid>

      <Panel title={t("overview.stepsTitle")} note={t("overview.stepsNote")}>
        <div className="flex items-stretch gap-1">
          <Step tone="placed" label={t("overview.placed")} stage={steps.placed} />
          <ChevronRight className="size-4 shrink-0 self-center text-muted-foreground" aria-hidden />
          <Step tone="confirmed" label={t("overview.confirmed")} stage={steps.confirmed} />
          <ChevronRight className="size-4 shrink-0 self-center text-muted-foreground" aria-hidden />
          <Step tone="delivered" label={t("overview.delivered")} stage={steps.delivered} />
        </div>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>
            <strong className="font-semibold text-amber-800 dark:text-amber-400">{t("orderCount", { n: format.count(steps.not_confirmed) })}</strong>{" "}
            {t("overview.notConfirmed")}
          </span>
          <span>
            <strong className="font-semibold text-amber-800 dark:text-amber-400">{t("orderCount", { n: format.count(steps.not_delivered) })}</strong>{" "}
            {t("overview.notDelivered")}
          </span>
        </div>
      </Panel>

      <Panel title={t("overview.salesByDay")}>
        <TrendChart
          data={report.series.data}
          comparison={report.series.comparison}
          value={(point) => Number(point.sales)}
          hourly={report.period.start_date === report.period.end_date}
          show={(n) => format.money(n)}
          labels={{ current: t("thesePeriod"), previous: t("comparedPeriod") }}
        />
      </Panel>

      {full ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {report.journey ? <Journey journey={report.journey} /> : null}
          <Panel title={t("overview.sourcesTitle")} more={{ section: "traffic", label: t("sections.traffic") }}>
            <BarList
              rows={(report.sources ?? []).map((row) => ({
                key: row.source,
                label: sourceName(row.source, t),
                detail: t("overview.sourceDetail", { orders: format.count(row.orders), visitors: format.count(row.visitors) }),
                value: format.money(row.sales),
                share: shareOf(Number(row.sales), Math.max(...(report.sources ?? []).map((r) => Number(r.sales)), 0)),
              }))}
            />
          </Panel>
          <TopDistricts report={report} />
          <DeliverySummary report={report} />
          <BestSellers report={report} />
        </div>
      ) : (
        <Upgrade title={t("upgradeOverview")} />
      )}
    </div>
  );
}

const TONES = {
  placed: { box: "bg-muted", dot: "bg-muted-foreground" },
  confirmed: { box: "bg-blue-50 outline outline-[1.5px] outline-blue-600 dark:bg-blue-950/40", dot: "bg-blue-600" },
  delivered: { box: "bg-muted", dot: "bg-emerald-600" },
} as const;

function Step({ tone, label, stage }: { tone: keyof typeof TONES; label: string; stage: { orders: number; sales: string } }) {
  const t = useTranslations("analyticsPage");
  const { format } = useAnalyticsView();
  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-0.5 rounded-ui p-2.5 ${TONES[tone].box}`}>
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
        <span className={`size-2 rounded-[2px] ${TONES[tone].dot}`} aria-hidden />
        {label}
      </span>
      <span className="truncate text-base font-semibold text-foreground tabular-nums">{format.money(stage.sales)}</span>
      <span className="text-[11px] text-muted-foreground">{t("orderCount", { n: format.count(stage.orders) })}</span>
    </div>
  );
}

function Journey({ journey }: { journey: NonNullable<OverviewReport["journey"]> }) {
  const t = useTranslations("analyticsPage");
  const { format } = useAnalyticsView();
  const steps = [
    { key: "visitors", n: journey.visitors, of: null },
    { key: "viewed_product", n: journey.viewed_product, of: journey.visitors },
    { key: "added_to_cart", n: journey.added_to_cart, of: journey.viewed_product },
    { key: "started_checkout", n: journey.started_checkout, of: journey.added_to_cart },
    { key: "placed", n: journey.placed, of: journey.started_checkout },
    { key: "confirmed", n: journey.confirmed, of: journey.placed },
  ] as const;
  return (
    <Panel title={t("overview.journeyTitle")} note={t("overview.journeyNote")}>
      {journey.visitors ? (
        <ol className="flex flex-col gap-2.5">
          {steps.map((step) => (
            <li key={step.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium text-foreground">{t(`overview.journey.${step.key}`)}</span>
                <span className="font-semibold text-foreground tabular-nums">{format.count(step.n)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, shareOf(step.n, journey.visitors))}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right text-[11px] text-muted-foreground">
                  {step.of === null ? format.percent(100) : step.of ? format.percent(shareOf(step.n, step.of)) : "—"}
                </span>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <Empty>{t("overview.journeyEmpty")}</Empty>
      )}
      <p className="text-[11px] text-muted-foreground">{t("overview.journeyFootnote")}</p>
    </Panel>
  );
}

function TopDistricts({ report }: { report: OverviewReport }) {
  const t = useTranslations("analyticsPage");
  const locale = useLocale();
  const { format } = useAnalyticsView();
  const rows = report.districts ?? [];
  const most = Math.max(...rows.map((row) => Number(row.sales)), 0);
  return (
    <Panel title={t("overview.districtsTitle")} more={{ section: "districts", label: t("sections.districts") }}>
      <BarList
        rows={rows.map((row) => ({
          key: row.key,
          label: locale === "bn" ? row.name_bn : row.name,
          detail: t("orderCount", { n: format.count(row.orders) }),
          value: format.money(row.sales),
          share: shareOf(Number(row.sales), most),
        }))}
      />
    </Panel>
  );
}

function DeliverySummary({ report }: { report: OverviewReport }) {
  const t = useTranslations("analyticsPage");
  const { format } = useAnalyticsView();
  const parcels = report.parcels;
  if (!parcels) return null;
  const items = [
    { key: "delivered", n: parcels.delivered },
    { key: "partial", n: parcels.partial },
    { key: "returned", n: parcels.returned },
    { key: "in_transit", n: parcels.in_transit },
  ] as const;
  return (
    <Panel title={t("overview.deliveryTitle")} more={{ section: "delivery", label: t("sections.delivery") }}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.key} className="flex flex-col rounded-ui bg-muted p-2.5">
            <span className="text-lg font-semibold text-foreground tabular-nums">{format.count(item.n)}</span>
            <span className="text-[11px] text-muted-foreground">{t(`parcels.${item.key}`)}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function BestSellers({ report }: { report: OverviewReport }) {
  const t = useTranslations("analyticsPage");
  const { format } = useAnalyticsView();
  const rows = report.best_sellers ?? [];
  return (
    <Panel title={t("overview.bestSellersTitle")} more={{ section: "products", label: t("sections.products") }}>
      {rows.length ? (
        <ul className="flex flex-col divide-y divide-border">
          {rows.map((row) => (
            <li key={row.product_id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{row.product_name}</span>
                <span className="text-xs text-muted-foreground">
                  {t("overview.soldViews", { sold: format.count(row.units), views: format.count(row.views) })}
                </span>
              </div>
              <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">{format.money(row.revenue)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty />
      )}
    </Panel>
  );
}

function LiveStrip() {
  const t = useTranslations("analyticsPage");
  const { format, goTo } = useAnalyticsView();
  const live = useLive(true);
  if (!live.data) return null;
  return (
    <button
      type="button"
      onClick={() => goTo("live")}
      className="flex items-center justify-between gap-2.5 rounded-card border border-border bg-card px-3.5 py-3 text-left"
    >
      <span className="inline-flex items-center gap-2.5 text-[13px] text-foreground">
        <span className="size-[9px] shrink-0 rounded-full bg-emerald-600 shadow-[0_0_0_4px_rgba(5,150,105,0.18)]" aria-hidden />
        <span>
          {t.rich("overview.liveStrip", {
            visitors: format.count(live.data.right_now),
            orders: format.count(live.data.orders_last_hour),
            strong: (chunks) => <strong className="font-semibold">{chunks}</strong>,
          })}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}
