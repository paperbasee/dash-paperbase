"use client";

import { useTranslations } from "next-intl";

import { ChartLegend, Empty, ListPanel, Panel, Stat, StatStrip, TrendChart, shareOf } from "../_components/kit";
import { useAnalyticsView } from "../_lib/context";
import { busiestHours, pairUp } from "../_lib/insights";
import { paymentName } from "../_lib/names";
import type { SalesReport } from "../_lib/types";

export function Sales({ report }: { report: SalesReport }) {
  const t = useTranslations("analyticsPage");
  const { format } = useAnalyticsView();
  const { cards, made_of: madeOf, period } = report;
  const peak = busiestHours(report.hours);
  const tallest = Math.max(...report.hours, 0);
  const money = (value: number | string) => format.money(value);
  const mostSold = Math.max(...report.coupons.map((row) => Number(row.sales)), 0);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <StatStrip count={4}>
        <Stat label={t("cards.sales")} hint={t("cards.salesHint")} card={cards.sales} show={money} />
        <Stat label={t("cards.averageOrder")} card={cards.average_order} show={money} />
        <Stat
          label={t("cards.itemsPerOrder")}
          card={cards.items_per_order}
          show={(value) => format.decimal(Number(value))}
          plain={(n) => format.decimal(n)}
        />
        <Stat label={t("cards.discounts")} hint={t("cards.discountsHint")} card={cards.discounts} show={money} />
      </StatStrip>

      <Panel title={t("chart.sales", { by: period.start_date === period.end_date ? "hour" : "day" })} aside={<ChartLegend period={period} />}>
        <TrendChart
          points={pairUp(report.series, (point) => Number(point.sales))}
          period={period}
          show={(n) => format.money(n)}
          axis={format.moneyCompact}
        />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("sales.madeOfTitle")} note={t("sales.madeOfNote")}>
          <dl className="flex flex-col divide-y divide-border text-sm">
            <Line label={t("sales.fullPrice")} note={t("sales.fullPriceNote")} value={format.money(madeOf.full_price)} />
            <Line
              label={t("sales.discountsLine")}
              note={t("sales.discountsNote", { share: format.percent(madeOf.discount_share) })}
              value={`−${format.money(madeOf.discounts)}`}
            />
            <Line label={t("sales.salesLine")} note={t("sales.salesNote")} value={format.money(madeOf.sales)} strong />
            <Line label={t("sales.deliveryLine")} note={t("sales.deliveryNote")} value={format.money(madeOf.delivery_charges)} />
          </dl>
        </Panel>

        <Panel title={t("sales.hoursTitle")} note={t("sales.hoursNote")}>
          {tallest ? (
            <>
              <div className="flex h-32 items-end gap-[3px]" aria-hidden>
                {report.hours.map((orders, hour) => (
                  <div
                    key={hour}
                    title={`${format.hourOfDay(hour)}: ${format.count(orders)}`}
                    className={`flex-1 rounded-t-[2px] ${peak && (hour === peak[0] || hour === (peak[0] + 1) % 24) ? "bg-[hsl(var(--accent-blue))]" : "bg-[hsl(var(--accent-blue)/0.3)]"}`}
                    style={{ height: `${Math.max(2, shareOf(orders, tallest))}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{format.hourOfDay(0)}</span>
                <span>{format.hourOfDay(12)}</span>
                <span>{format.hourOfDay(23)}</span>
              </div>
              {peak ? (
                <p className="text-sm text-foreground">
                  {t.rich("sales.peak", {
                    from: format.hourOfDay(peak[0]),
                    to: format.hourOfDay((peak[0] + 2) % 24),
                    strong: (chunks) => <strong className="font-semibold">{chunks}</strong>,
                  })}
                </p>
              ) : null}
            </>
          ) : (
            <Empty />
          )}
        </Panel>

        <ListPanel
          tabs={[
            {
              key: "payments",
              label: t("sales.paymentsTitle"),
              columns: [{ label: t("columns.orders") }, { label: t("columns.share"), wide: true }, { label: t("columns.sales") }],
              rows: report.payments.map((row) => ({
                key: row.method,
                label: paymentName(row.method, t),
                values: [format.count(row.orders), format.percent(row.share), format.money(row.sales)],
                share: row.share,
              })),
            },
          ]}
        />

        <ListPanel
          tabs={[
            {
              key: "codes",
              label: t("sales.codesTitle"),
              columns: [{ label: t("columns.orders") }, { label: t("columns.given"), wide: true }, { label: t("columns.sales") }],
              empty: t("sales.noCodes"),
              rows: report.coupons.map((row) => ({
                key: row.code,
                label: <span className="font-mono font-semibold">{row.code}</span>,
                detail:
                  row.kind && row.value !== null
                    ? row.kind === "percent"
                      ? t("sales.percentOff", { n: format.decimal(Number(row.value)) })
                      : t("sales.amountOff", { amount: format.money(row.value) })
                    : undefined,
                values: [format.count(row.orders), `−${format.money(row.given)}`, format.money(row.sales)],
                share: shareOf(Number(row.sales), mostSold),
              })),
            },
          ]}
        />
      </div>
    </div>
  );
}

function Line({ label, note, value, strong = false }: { label: string; note: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-col">
        <dt className={strong ? "font-semibold text-foreground" : "font-medium text-foreground"}>{label}</dt>
        <span className="text-xs text-muted-foreground">{note}</span>
      </div>
      <dd className={`shrink-0 tabular-nums ${strong ? "text-base font-semibold text-foreground" : "font-medium text-foreground"}`}>{value}</dd>
    </div>
  );
}
