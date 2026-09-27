"use client";

import { useTranslations } from "next-intl";

import { BarList, Empty, Panel, StatCard, StatGrid, TrendChart, shareOf } from "../_components/kit";
import { useAnalyticsView } from "../_lib/context";
import { paymentName } from "../_lib/names";
import { busiestHours } from "../_lib/insights";
import type { SalesReport } from "../_lib/types";

export function Sales({ report }: { report: SalesReport }) {
  const t = useTranslations("analyticsPage");
  const { format } = useAnalyticsView();
  const { cards, made_of: madeOf } = report;
  const peak = busiestHours(report.hours);
  const tallest = Math.max(...report.hours, 0);

  return (
    <div className="flex flex-col gap-3">
      <StatGrid>
        <StatCard label={t("cards.sales")} hint={t("cards.salesHint")} value={format.money(cards.sales.value)} card={cards.sales} />
        <StatCard label={t("cards.averageOrder")} value={format.money(cards.average_order.value)} card={cards.average_order} />
        <StatCard
          label={t("cards.itemsPerOrder")}
          value={format.decimal(Number(cards.items_per_order.value))}
          card={cards.items_per_order}
          plain={(n) => format.decimal(n)}
        />
        <StatCard
          label={t("cards.discounts")}
          hint={t("cards.discountsHint")}
          value={format.money(cards.discounts.value)}
          card={cards.discounts}
        />
      </StatGrid>

      <div className="grid gap-3 lg:grid-cols-2">
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

        <Panel title={t("sales.byDay")}>
          <TrendChart
            data={report.series.data}
            comparison={report.series.comparison}
            value={(point) => Number(point.sales)}
            hourly={report.period.start_date === report.period.end_date}
            show={(n) => format.money(n)}
            labels={{ current: t("thesePeriod"), previous: t("comparedPeriod") }}
          />
        </Panel>

        <Panel title={t("sales.hoursTitle")} note={t("sales.hoursNote")}>
          {tallest ? (
            <>
              <div className="flex h-28 items-end gap-[3px]" aria-hidden>
                {report.hours.map((orders, hour) => (
                  <div
                    key={hour}
                    title={`${format.hourOfDay(hour)}: ${format.count(orders)}`}
                    className={`flex-1 rounded-t-[2px] ${peak && (hour === peak[0] || hour === (peak[0] + 1) % 24) ? "bg-primary" : "bg-primary/30"}`}
                    style={{ height: `${Math.max(2, shareOf(orders, tallest))}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
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

        <Panel title={t("sales.paymentsTitle")}>
          <BarList
            rows={report.payments.map((row) => ({
              key: row.method,
              label: paymentName(row.method, t),
              detail: t("sales.paymentDetail", { orders: format.count(row.orders), share: format.percent(row.share) }),
              value: format.money(row.sales),
              share: row.share,
            }))}
          />
        </Panel>

        <Panel title={t("sales.codesTitle")} className="lg:col-span-2">
          {report.coupons.length ? (
            <ul className="flex flex-col divide-y divide-border">
              {report.coupons.map((row) => (
                <li key={row.code} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 flex-col">
                    <span className="font-mono text-sm font-semibold text-foreground">{row.code}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("orderCount", { n: format.count(row.orders) })}
                      {row.kind && row.value !== null
                        ? ` · ${row.kind === "percent" ? t("sales.percentOff", { n: format.decimal(Number(row.value)) }) : t("sales.amountOff", { amount: format.money(row.value) })}`
                        : ""}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-sm font-semibold text-foreground tabular-nums">{format.money(row.sales)}</span>
                    <span className="text-xs text-muted-foreground">{t("sales.given", { amount: format.money(row.given) })}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{t("sales.noCodes")}</Empty>
          )}
        </Panel>
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
