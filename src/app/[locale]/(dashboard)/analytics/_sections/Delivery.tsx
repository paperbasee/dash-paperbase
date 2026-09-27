"use client";

import { useLocale, useTranslations } from "next-intl";

import { Empty, ListPanel, Panel, Stat, StatStrip, shareOf } from "../_components/kit";
import { useAnalyticsView } from "../_lib/context";
import { courierName } from "../_lib/names";
import type { DeliveryReport } from "../_lib/types";

const PARCEL_BARS = [
  { key: "delivered", color: "bg-emerald-600" },
  { key: "partial", color: "bg-amber-500" },
  { key: "returned", color: "bg-rose-600" },
  { key: "in_transit", color: "bg-blue-600" },
  { key: "not_dispatched", color: "bg-slate-300 dark:bg-slate-600" },
  { key: "unknown", color: "bg-slate-400" },
] as const;
/** A courier returning this share of its parcels is worth a second look. */
const MANY_RETURNS = 20;

export function Delivery({ report }: { report: DeliveryReport }) {
  const t = useTranslations("analyticsPage");
  const locale = useLocale();
  const { format } = useAnalyticsView();
  const { cards, parcels } = report;
  const sent = Object.values(parcels).reduce((sum, n) => sum + n, 0);
  const days = (n: number) => t("delivery.days", { n: format.decimal(n) });
  const rate = (value: number | string) => format.percent(Number(value));
  const mostParcels = Math.max(...report.couriers.map((row) => row.parcels), 0);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <StatStrip count={4}>
        <Stat label={t("cards.delivered")} hint={t("cards.deliveredHint")} card={cards.delivered} show={rate} />
        <Stat label={t("cards.returned")} hint={t("cards.returnedHint")} card={cards.returned} show={rate} lowerIsBetter />
        <Stat
          label={t("cards.daysToDeliver")}
          hint={t("cards.daysToDeliverHint")}
          card={cards.days_to_deliver}
          show={(value) => days(Number(value))}
          lowerIsBetter
          plain={days}
        />
        <Stat
          label={t("cards.notSent")}
          hint={t("cards.notSentHint")}
          card={cards.not_sent}
          show={(value) => format.count(Number(value))}
          lowerIsBetter
          plain={(n) => format.count(n)}
        />
      </StatStrip>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("delivery.parcelsTitle")} note={t("delivery.parcelsNote", { n: format.count(sent) })} className="lg:col-span-2">
          {sent ? (
            <>
              <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted">
                {PARCEL_BARS.map((bar) => (
                  <div key={bar.key} className={`h-full ${bar.color}`} style={{ width: `${shareOf(parcels[bar.key], sent)}%` }} />
                ))}
              </div>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {PARCEL_BARS.filter((bar) => parcels[bar.key]).map((bar) => (
                  <li key={bar.key} className="flex items-center gap-2 text-xs">
                    <span className={`size-2 shrink-0 rounded-[2px] ${bar.color}`} aria-hidden />
                    <span className="font-semibold text-foreground tabular-nums">{format.count(parcels[bar.key])}</span>
                    <span className="text-muted-foreground">{t(`parcels.${bar.key}`)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Empty />
          )}
        </Panel>

        <ListPanel
          tabs={[
            {
              key: "couriers",
              label: t("delivery.couriersTitle"),
              columns: [
                { label: t("columns.parcels"), wide: true },
                { label: t("columns.days"), wide: true },
                { label: t("columns.returned") },
                { label: t("columns.delivered") },
              ],
              rows: report.couriers.map((row) => ({
                key: row.courier || "none",
                label: courierName(row.courier, t),
                values: [
                  format.count(row.parcels),
                  row.days_to_deliver === null ? "—" : format.decimal(row.days_to_deliver),
                  <span key="returned" className={row.returned_rate >= MANY_RETURNS ? "text-rose-700 dark:text-rose-400" : undefined}>
                    {format.percent(row.returned_rate)}
                  </span>,
                  format.percent(row.delivered_rate),
                ],
                share: shareOf(row.parcels, mostParcels),
              })),
            },
          ]}
        />

        <ListPanel
          note={t("delivery.speedNote")}
          tabs={[
            {
              key: "speed",
              label: t("delivery.speedTitle"),
              columns: [{ label: t("columns.share") }],
              rows: report.speed.map((row) => ({
                key: row.days,
                label: t(`delivery.speed.${row.days === "0-1" ? "sameOrNext" : row.days === "4+" ? "fourPlus" : `d${row.days}`}`),
                values: [format.percent(row.share)],
                share: row.share,
              })),
            },
          ]}
        />

        <ListPanel
          className="lg:col-span-2"
          note={t("delivery.returnsNote")}
          tabs={[
            {
              key: "returns",
              label: t("delivery.returnsTitle"),
              columns: [{ label: t("columns.parcels") }, { label: t("columns.returned") }],
              empty: t("delivery.noReturns"),
              rows: report.most_returns.map((row) => ({
                key: row.key,
                label: locale === "bn" ? row.name_bn : row.name,
                values: [format.count(row.parcels), format.percent(row.returned_rate)],
                share: row.returned_rate,
              })),
            },
          ]}
        />
      </div>
    </div>
  );
}
