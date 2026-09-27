"use client";

import { useTranslations } from "next-intl";

import { BarList, Empty, Panel, StatCard, StatGrid, TrendChart, shareOf } from "../_components/kit";
import { useAnalyticsView } from "../_lib/context";
import { pageName, sourceName } from "../_lib/names";
import type { TrafficReport } from "../_lib/types";

export function Traffic({ report }: { report: TrafficReport }) {
  const t = useTranslations("analyticsPage");
  const { format } = useAnalyticsView();
  const { cards } = report;
  const units = { m: t("units.m"), s: t("units.s") };
  const mostVisitors = Math.max(...report.sources.map((row) => row.visitors), 0);
  const everyone = report.visitor_mix.new + report.visitor_mix.returning;

  return (
    <div className="flex flex-col gap-3">
      <StatGrid>
        <StatCard label={t("cards.visitors")} hint={t("cards.visitorsHint")} value={format.count(Number(cards.visitors.value))} card={cards.visitors} />
        <StatCard label={t("cards.visits")} hint={t("cards.visitsHint")} value={format.count(Number(cards.visits.value))} card={cards.visits} />
        <StatCard label={t("cards.engaged")} hint={t("cards.engagedHint")} value={format.percent(Number(cards.engaged.value))} card={cards.engaged} />
        <StatCard
          label={t("cards.timeOnShop")}
          hint={t("cards.timeOnShopHint")}
          value={format.duration(Number(cards.time_on_shop.value), units)}
          card={cards.time_on_shop}
        />
      </StatGrid>

      <Panel title={t("traffic.byDay")}>
        <TrendChart
          data={report.series.data}
          comparison={report.series.comparison}
          value={(point) => point.visitors}
          hourly={report.period.start_date === report.period.end_date}
          show={(n) => format.count(n)}
          labels={{ current: t("thesePeriod"), previous: t("comparedPeriod") }}
        />
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title={t("traffic.sourcesTitle")} note={t("traffic.sourcesNote")} className="lg:col-span-2">
          {report.sources.length ? (
            <ul className="flex flex-col gap-3">
              {report.sources.map((row) => (
                <li key={row.source} className="flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">{sourceName(row.source, t)}</span>
                      <span className="text-xs text-muted-foreground">
                        {[
                          row.paid_visitors ? t("traffic.fromAds", { n: format.count(row.paid_visitors) }) : null,
                          t("orderCount", { n: format.count(row.orders) }),
                          format.money(row.sales),
                          t("traffic.buyRate", { rate: format.percent(row.conversion) }),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">{format.count(row.visitors)}</span>
                  </div>
                  <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${shareOf(row.paid_visitors, mostVisitors)}%` }} />
                    <div className="h-full bg-primary/40" style={{ width: `${shareOf(row.visitors - row.paid_visitors, mostVisitors)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title={t("traffic.campaignsTitle")} note={t("traffic.campaignsNote")}>
          {report.campaigns.length ? (
            <ul className="flex flex-col divide-y divide-border">
              {report.campaigns.map((row) => (
                <li key={row.campaign} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{row.campaign}</span>
                    <span className="text-xs text-muted-foreground">
                      {sourceName(row.source, t)}
                      {row.channel ? ` · ${t(`channels.${row.channel}`)}` : ""} · {t("traffic.visitorCount", { n: format.count(row.visitors) })}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-sm font-semibold text-foreground tabular-nums">{format.money(row.sales)}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("orderCount", { n: format.count(row.orders) })} · {t("traffic.buyRate", { rate: format.percent(row.conversion) })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{t("traffic.noCampaigns")}</Empty>
          )}
        </Panel>

        <Panel title={t("traffic.landingTitle")} note={t("traffic.landingNote")}>
          <BarList
            rows={report.landing.map((row) => ({
              key: row.path,
              label: pageName(row, t),
              detail: t("traffic.landingDetail", {
                visitors: format.count(row.visitors),
                stay: format.percent(row.engaged_rate),
                buy: format.percent(row.conversion),
              }),
              value: format.count(row.visitors),
              share: shareOf(row.visitors, Math.max(...report.landing.map((r) => r.visitors), 0)),
            }))}
          />
        </Panel>

        <Panel title={t("traffic.devicesTitle")}>
          <BarList
            rows={report.devices.map((row) => ({
              key: row.device,
              label: t(`devices.${row.device}`),
              detail: t("traffic.deviceDetail", { visitors: format.count(row.visitors), buy: format.percent(row.conversion) }),
              value: format.percent(row.share),
              share: row.share,
            }))}
          />
        </Panel>

        <Panel title={t("traffic.mixTitle")}>
          {everyone ? (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${shareOf(report.visitor_mix.new, everyone)}%` }} />
                <div className="h-full bg-emerald-600" style={{ width: `${shareOf(report.visitor_mix.returning, everyone)}%` }} />
              </div>
              <div className="flex justify-between gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <span className="size-2 rounded-[2px] bg-primary" aria-hidden />
                  {t("traffic.new", { n: format.count(report.visitor_mix.new), share: format.percent(shareOf(report.visitor_mix.new, everyone)) })}
                </span>
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <span className="size-2 rounded-[2px] bg-emerald-600" aria-hidden />
                  {t("traffic.returning", {
                    n: format.count(report.visitor_mix.returning),
                    share: format.percent(shareOf(report.visitor_mix.returning, everyone)),
                  })}
                </span>
              </div>
            </>
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title={t("traffic.searchesTitle")} note={t("traffic.searchesNote")} className="lg:col-span-2">
          {report.searches.length ? (
            <ul className="flex flex-col divide-y divide-border">
              {report.searches.map((row) => (
                <li key={row.query} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{row.query}</span>
                    <span className={`text-xs ${row.results === 0 ? "font-medium text-amber-800 dark:text-amber-400" : "text-muted-foreground"}`}>
                      {row.results === 0
                        ? t("traffic.noResults")
                        : t("traffic.searchDetail", {
                            results: row.results === null ? "—" : format.count(row.results),
                            bought: format.count(row.bought),
                          })}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-sm font-semibold text-foreground tabular-nums">{t("traffic.searchCount", { n: format.count(row.searches) })}</span>
                    {row.results === 0 ? <span className="text-xs text-muted-foreground">{t("traffic.addIt")}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{t("traffic.noSearches")}</Empty>
          )}
        </Panel>
      </div>
    </div>
  );
}
