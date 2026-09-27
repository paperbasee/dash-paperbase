"use client";

import { useTranslations } from "next-intl";

import { ChartLegend, Empty, ListPanel, Panel, Stat, StatStrip, TrendChart, shareOf } from "../_components/kit";
import { useAnalyticsView } from "../_lib/context";
import { pairUp } from "../_lib/insights";
import { pageName, sourceName } from "../_lib/names";
import type { TrafficReport } from "../_lib/types";

export function Traffic({ report }: { report: TrafficReport }) {
  const t = useTranslations("analyticsPage");
  const { format } = useAnalyticsView();
  const { cards, period } = report;
  const units = { m: t("units.m"), s: t("units.s") };
  const count = (value: number | string) => format.count(Number(value));
  const most = (rows: { visitors: number }[]) => Math.max(...rows.map((row) => row.visitors), 0);
  const everyone = report.visitor_mix.new + report.visitor_mix.returning;
  const mostSearched = Math.max(...report.searches.map((row) => row.searches), 0);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <StatStrip count={4}>
        <Stat label={t("cards.visitors")} hint={t("cards.visitorsHint")} card={cards.visitors} show={count} />
        <Stat label={t("cards.visits")} hint={t("cards.visitsHint")} card={cards.visits} show={count} />
        <Stat label={t("cards.engaged")} hint={t("cards.engagedHint")} card={cards.engaged} show={(value) => format.percent(Number(value))} />
        <Stat
          label={t("cards.timeOnShop")}
          hint={t("cards.timeOnShopHint")}
          card={cards.time_on_shop}
          show={(value) => format.duration(Number(value), units)}
        />
      </StatStrip>

      <Panel title={t("chart.visitors", { by: period.start_date === period.end_date ? "hour" : "day" })} aside={<ChartLegend period={period} />}>
        <TrendChart
          points={pairUp(report.series, (point) => point.visitors)}
          period={period}
          show={(n) => format.count(n)}
          axis={format.compact}
        />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListPanel
          className="lg:col-span-2"
          note={t("traffic.sourcesNote")}
          tabs={[
            {
              key: "sources",
              label: t("traffic.sourcesTitle"),
              columns: [
                { label: t("columns.visitors") },
                { label: t("columns.fromAds"), wide: true },
                { label: t("columns.orders") },
                { label: t("columns.buy"), wide: true },
                { label: t("columns.sales") },
              ],
              rows: report.sources.map((row) => ({
                key: row.source,
                label: sourceName(row.source, t),
                values: [
                  format.count(row.visitors),
                  format.count(row.paid_visitors),
                  format.count(row.orders),
                  format.percent(row.conversion),
                  format.money(row.sales),
                ],
                share: shareOf(row.visitors, most(report.sources)),
              })),
            },
          ]}
        />

        <ListPanel
          note={t("traffic.campaignsNote")}
          tabs={[
            {
              key: "campaigns",
              label: t("traffic.campaignsTitle"),
              columns: [{ label: t("columns.visitors"), wide: true }, { label: t("columns.orders") }, { label: t("columns.sales") }],
              empty: t("traffic.noCampaigns"),
              rows: report.campaigns.map((row) => ({
                key: row.campaign,
                label: row.campaign,
                detail: [sourceName(row.source, t), row.channel ? t(`channels.${row.channel}`) : null].filter(Boolean).join(" · "),
                values: [format.count(row.visitors), format.count(row.orders), format.money(row.sales)],
                share: shareOf(row.visitors, most(report.campaigns)),
              })),
            },
          ]}
        />

        <ListPanel
          note={t("traffic.landingNote")}
          tabs={[
            {
              key: "landing",
              label: t("traffic.landingTitle"),
              columns: [{ label: t("columns.visitors") }, { label: t("columns.stayOn"), wide: true }, { label: t("columns.buy") }],
              rows: report.landing.map((row) => ({
                key: row.path,
                label: pageName(row, t),
                values: [format.count(row.visitors), format.percent(row.engaged_rate), format.percent(row.conversion)],
                share: shareOf(row.visitors, most(report.landing)),
              })),
            },
          ]}
        />

        <ListPanel
          tabs={[
            {
              key: "devices",
              label: t("traffic.devicesTitle"),
              columns: [{ label: t("columns.visitors"), wide: true }, { label: t("columns.buy") }, { label: t("columns.share") }],
              rows: report.devices.map((row) => ({
                key: row.device,
                label: t(`devices.${row.device}`),
                values: [format.count(row.visitors), format.percent(row.conversion), format.percent(row.share)],
                share: row.share,
              })),
            },
          ]}
        />

        <Panel title={t("traffic.mixTitle")}>
          {everyone ? (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-[hsl(var(--accent-blue))]" style={{ width: `${shareOf(report.visitor_mix.new, everyone)}%` }} />
                <div className="h-full bg-emerald-600" style={{ width: `${shareOf(report.visitor_mix.returning, everyone)}%` }} />
              </div>
              <div className="flex justify-between gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <span className="size-2 rounded-[2px] bg-[hsl(var(--accent-blue))]" aria-hidden />
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

        <ListPanel
          className="lg:col-span-2"
          note={t("traffic.searchesNote")}
          tabs={[
            {
              key: "searches",
              label: t("traffic.searchesTitle"),
              columns: [{ label: t("columns.searches") }, { label: t("columns.results") }, { label: t("columns.bought"), wide: true }],
              empty: t("traffic.noSearches"),
              rows: report.searches.map((row) => ({
                key: row.query,
                label: row.query,
                detail:
                  row.results === 0 ? (
                    <span className="font-medium text-amber-800 dark:text-amber-400">{t("traffic.addIt")}</span>
                  ) : undefined,
                values: [
                  format.count(row.searches),
                  row.results === null ? "—" : format.count(row.results),
                  format.count(row.bought),
                ],
                share: shareOf(row.searches, mostSearched),
              })),
            },
          ]}
        />
      </div>
    </div>
  );
}
