"use client";

import { useLocale, useTranslations } from "next-intl";

import { formatOrderStatusLabel } from "@/lib/orders/order-statuses";

import { BarList, Empty, Panel, shareOf } from "../_components/kit";
import { useAnalyticsView } from "../_lib/context";
import { pageName, sourceName } from "../_lib/names";
import type { LiveReport } from "../_lib/types";

export function Live({ report }: { report: LiveReport }) {
  const t = useTranslations("analyticsPage");
  const tPages = useTranslations("pages");
  const locale = useLocale();
  const { format } = useAnalyticsView();
  const tallest = Math.max(...report.minutes, 0);

  const ago = (iso: string) => {
    const minutes = Math.max(0, Math.round((report.at * 1000 - new Date(iso).getTime()) / 60_000));
    return minutes < 1 ? t("justNow") : t("minutesAgo", { n: format.count(minutes) });
  };

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={t("live.title")} note={t("live.note")} className="lg:col-span-2">
        <div className="flex items-end gap-3">
          <span className="inline-flex items-center gap-2 text-4xl font-semibold text-foreground tabular-nums">
            <span className="size-2.5 rounded-full bg-emerald-600 shadow-[0_0_0_5px_rgba(5,150,105,0.18)]" aria-hidden />
            {format.count(report.right_now)}
          </span>
          <span className="pb-1 text-sm text-muted-foreground">{t("live.rightNow")}</span>
        </div>
        <div className="flex h-20 items-end gap-[2px]" aria-hidden>
          {report.minutes.map((n, index) => (
            <div
              key={index}
              className={`flex-1 rounded-t-[2px] ${index === report.minutes.length - 1 ? "bg-emerald-600" : "bg-emerald-600/40"}`}
              style={{ height: `${tallest ? Math.max(3, shareOf(n, tallest)) : 3}%` }}
            />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">{t("live.minutesNote")}</p>
      </Panel>

      <Panel title={t("live.pagesTitle")}>
        <BarList
          empty={t("live.nobody")}
          rows={report.pages.map((row) => ({
            key: row.path,
            label: pageName(row, t),
            value: format.count(row.visitors),
            share: shareOf(row.visitors, report.right_now),
          }))}
        />
      </Panel>

      <Panel title={t("live.sourcesTitle")}>
        <BarList
          empty={t("live.nobody")}
          rows={report.sources.map((row) => ({
            key: row.source,
            label: sourceName(row.source, t),
            value: format.count(row.visitors),
            share: shareOf(row.visitors, report.right_now),
          }))}
        />
      </Panel>

      <Panel title={t("live.ordersTitle")} note={t("live.ordersNote", { n: format.count(report.orders_last_hour) })} className="lg:col-span-2">
        {report.latest_orders.length ? (
          <ul className="flex flex-col divide-y divide-border">
            {report.latest_orders.map((row) => (
              <li key={row.order_number} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold text-foreground">{format.digits(row.order_number)}</span>
                  <span className="text-xs text-muted-foreground">
                    {[
                      locale === "bn" ? row.district_bn : row.district,
                      row.source ? t("live.from", { source: sourceName(row.source, t) }) : null,
                      ago(row.placed_at),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <span className="text-sm font-semibold text-foreground tabular-nums">{format.money(row.total)}</span>
                  <span className="text-xs text-muted-foreground">{formatOrderStatusLabel(row.status, tPages)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty />
        )}
      </Panel>
    </div>
  );
}
