"use client";

import { useTranslations } from "next-intl";

import { BarList, Empty, Panel, shareOf } from "../_components/kit";
import { useAnalyticsView } from "../_lib/context";
import type { ProductsReport } from "../_lib/types";

/** Best sellers shown in full; the rest of the table is for the ones with sales or views. */
const SHOWN = 10;

export function Products({ report }: { report: ProductsReport }) {
  const t = useTranslations("analyticsPage");
  const { format } = useAnalyticsView();
  const rows = report.data.slice(0, SHOWN);

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Panel title={t("products.bestTitle")} note={t("products.bestNote")} className="lg:col-span-2">
        {rows.length ? (
          <ol className="flex flex-col divide-y divide-border">
            {rows.map((row, index) => (
              <li key={row.product_id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-0.5 w-5 shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
                      {format.count(index + 1)}
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">{row.product_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {[row.category, t("products.sold", { n: format.count(row.units) })].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">{format.money(row.revenue)}</span>
                </div>
                <dl className="ml-7 grid grid-cols-4 gap-2 text-center">
                  <Figure label={t("products.views")} value={format.count(row.views)} />
                  <Figure label={t("products.toCart")} value={format.count(row.add_to_cart)} />
                  <Figure label={t("products.soldLabel")} value={format.count(row.units)} />
                  <Figure label={t("products.viewToBuy")} value={row.views ? format.percent(shareOf(row.units, row.views)) : "—"} />
                </dl>
              </li>
            ))}
          </ol>
        ) : (
          <Empty />
        )}
      </Panel>

      <div className="flex flex-col gap-3">
        <Panel title={t("products.categoriesTitle")}>
          <BarList
            rows={report.categories.map((row) => ({
              key: row.category || "none",
              label: row.category || t("products.noCategory"),
              detail: format.percent(row.share),
              value: format.money(row.sales),
              share: row.share,
            }))}
          />
        </Panel>

        <Panel title={t("products.lookTitle")} note={t("products.lookNote")}>
          {report.needs_a_look.length ? (
            <ul className="flex flex-col divide-y divide-border">
              {report.needs_a_look.map((row) => (
                <li key={`${row.kind}-${row.product_id}`} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                  <span className="truncate text-sm font-medium text-foreground">{row.product_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.kind === "looked_not_bought"
                      ? t("products.lookedNotBought", { views: format.count(row.views), rate: format.percent(row.conversion_rate) })
                      : row.kind === "came_back"
                        ? t("products.cameBack", { units: format.count(row.units), returned: format.count(row.returned), rate: format.percent(row.returned_rate) })
                        : t("products.soldOut", { views: format.count(row.views) })}
                  </span>
                  <span className="text-xs font-medium text-amber-800 dark:text-amber-400">{t(`products.advice.${row.kind}`)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{t("products.lookNothing")}</Empty>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-ui bg-muted px-1 py-1.5">
      <dd className="text-sm font-semibold text-foreground tabular-nums">{value}</dd>
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
    </div>
  );
}
