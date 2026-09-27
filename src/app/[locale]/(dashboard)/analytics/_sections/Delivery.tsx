"use client";

import { useLocale, useTranslations } from "next-intl";

import { BarList, Empty, Panel, StatCard, StatGrid, shareOf } from "../_components/kit";
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

export function Delivery({ report }: { report: DeliveryReport }) {
  const t = useTranslations("analyticsPage");
  const locale = useLocale();
  const { format } = useAnalyticsView();
  const { cards, parcels } = report;
  const sent = Object.values(parcels).reduce((sum, n) => sum + n, 0);
  const days = (n: number) => t("delivery.days", { n: format.decimal(n) });

  return (
    <div className="flex flex-col gap-3">
      <StatGrid>
        <StatCard label={t("cards.delivered")} hint={t("cards.deliveredHint")} value={format.percent(Number(cards.delivered.value))} card={cards.delivered} />
        <StatCard
          label={t("cards.returned")}
          hint={t("cards.returnedHint")}
          value={format.percent(Number(cards.returned.value))}
          card={cards.returned}
          lowerIsBetter
        />
        <StatCard
          label={t("cards.daysToDeliver")}
          hint={t("cards.daysToDeliverHint")}
          value={cards.days_to_deliver.value === null ? "—" : days(Number(cards.days_to_deliver.value))}
          card={cards.days_to_deliver}
          lowerIsBetter
          plain={days}
        />
        <StatCard
          label={t("cards.notSent")}
          hint={t("cards.notSentHint")}
          value={format.count(Number(cards.not_sent.value))}
          card={cards.not_sent}
          lowerIsBetter
          plain={(n) => format.count(n)}
        />
      </StatGrid>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title={t("delivery.parcelsTitle")} note={t("delivery.parcelsNote", { n: format.count(sent) })} className="lg:col-span-2">
          {sent ? (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                {PARCEL_BARS.map((bar) => (
                  <div key={bar.key} className={`h-full ${bar.color}`} style={{ width: `${shareOf(parcels[bar.key], sent)}%` }} />
                ))}
              </div>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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

        <Panel title={t("delivery.couriersTitle")}>
          {report.couriers.length ? (
            <ul className="flex flex-col divide-y divide-border">
              {report.couriers.map((row) => (
                <li key={row.courier || "none"} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{courierName(row.courier, t)}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("delivery.parcelCount", { n: format.count(row.parcels) })}
                      {row.days_to_deliver === null ? "" : ` · ${t("delivery.onAverage", { days: days(row.days_to_deliver) })}`}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-sm font-semibold text-foreground">{t("districts.deliveredRate", { rate: format.percent(row.delivered_rate) })}</span>
                    <span className={`text-xs ${row.returned_rate >= 20 ? "font-medium text-rose-700 dark:text-rose-400" : "text-muted-foreground"}`}>
                      {t("districts.returnedRate", { rate: format.percent(row.returned_rate) })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title={t("delivery.speedTitle")} note={t("delivery.speedNote")}>
          <BarList
            rows={report.speed.map((row) => ({
              key: row.days,
              label: t(`delivery.speed.${row.days === "0-1" ? "sameOrNext" : row.days === "4+" ? "fourPlus" : `d${row.days}`}`),
              value: format.percent(row.share),
              share: row.share,
            }))}
          />
        </Panel>

        <Panel title={t("delivery.returnsTitle")} note={t("delivery.returnsNote")} className="lg:col-span-2">
          {report.most_returns.length ? (
            <ul className="flex flex-col divide-y divide-border">
              {report.most_returns.map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{locale === "bn" ? row.name_bn : row.name}</span>
                    <span className="text-xs text-muted-foreground">{t("delivery.parcelCount", { n: format.count(row.parcels) })}</span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-rose-700 dark:text-rose-400">
                    {t("districts.returnedRate", { rate: format.percent(row.returned_rate) })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{t("delivery.noReturns")}</Empty>
          )}
        </Panel>
      </div>
    </div>
  );
}
