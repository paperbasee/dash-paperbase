"use client";

import { useLocale, useTranslations } from "next-intl";

import { Empty, Panel, StatCard, shareOf } from "../_components/kit";
import { useAnalyticsView } from "../_lib/context";
import type { CustomersReport } from "../_lib/types";

export function Customers({ report }: { report: CustomersReport }) {
  const t = useTranslations("analyticsPage");
  const locale = useLocale();
  const { format } = useAnalyticsView();
  const { cards } = report;
  const everyone = report.new.customers + report.returning.customers;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label={t("cards.customers")} hint={t("cards.customersHint")} value={format.count(Number(cards.customers.value))} card={cards.customers} />
        <StatCard label={t("cards.cameBack")} hint={t("cards.cameBackHint")} value={format.percent(Number(cards.came_back.value))} card={cards.came_back} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title={t("customers.mixTitle")}>
          {everyone ? (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${shareOf(report.new.customers, everyone)}%` }} />
                <div className="h-full bg-emerald-600" style={{ width: `${shareOf(report.returning.customers, everyone)}%` }} />
              </div>
              <div className="flex justify-between gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <span className="size-2 rounded-[2px] bg-primary" aria-hidden />
                  {t("traffic.new", { n: format.count(report.new.customers), share: format.percent(shareOf(report.new.customers, everyone)) })}
                </span>
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <span className="size-2 rounded-[2px] bg-emerald-600" aria-hidden />
                  {t("traffic.returning", {
                    n: format.count(report.returning.customers),
                    share: format.percent(shareOf(report.returning.customers, everyone)),
                  })}
                </span>
              </div>
              {report.returning.per_order && report.new.per_order ? (
                <p className="text-sm text-foreground">
                  {t.rich("customers.spend", {
                    returning: format.money(report.returning.per_order),
                    fresh: format.money(report.new.per_order),
                    strong: (chunks) => <strong className="font-semibold">{chunks}</strong>,
                  })}
                </p>
              ) : null}
            </>
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title={t("customers.topTitle")} note={t("customers.topNote")}>
          {report.top.length ? (
            <ul className="flex flex-col divide-y divide-border">
              {report.top.map((row) => (
                <li key={row.phone} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{row.name || "—"}</span>
                    <span className="text-xs text-muted-foreground">
                      {[format.digits(row.phone), locale === "bn" ? row.district_bn : row.district].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-sm font-semibold text-foreground tabular-nums">{format.money(row.spent)}</span>
                    <span className="text-xs text-muted-foreground">{t("orderCount", { n: format.count(row.orders) })}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title={t("customers.cohortTitle")} note={t("customers.cohortNote")} className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[20rem] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-1.5 pr-2 font-medium">{t("customers.firstOrder")}</th>
                  <th className="py-1.5 pr-2 font-medium">{t("customers.customersColumn")}</th>
                  {[1, 2, 3].map((n) => (
                    <th key={n} className="py-1.5 pr-2 font-medium">
                      {t("customers.monthN", { n: format.count(n) })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.cohorts.map((row) => (
                  <tr key={row.month} className="border-t border-border">
                    <td className="py-2 pr-2 font-medium text-foreground">{format.month(row.month)}</td>
                    <td className="py-2 pr-2 text-foreground tabular-nums">{format.count(row.customers)}</td>
                    {[0, 1, 2].map((index) => {
                      const share = row.came_back[index];
                      return (
                        <td key={index} className="py-2 pr-2">
                          {share === undefined ? null : (
                            <span
                              className="inline-block min-w-12 rounded-[2px] px-1.5 py-0.5 text-center text-xs font-medium text-foreground tabular-nums"
                              style={{ background: `hsl(var(--accent-blue) / ${0.08 + Math.min(share, 40) / 60})` }}
                            >
                              {format.percent(share)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
