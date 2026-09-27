"use client";

import { useTranslations } from "next-intl";

import { Empty, ListPanel, Panel, shareOf } from "../_components/kit";
import { useAnalyticsView } from "../_lib/context";
import type { ProductsReport } from "../_lib/types";

/** Best sellers shown in full; the rest of the table is for the ones with sales or views. */
const SHOWN = 10;

export function Products({ report }: { report: ProductsReport }) {
  const t = useTranslations("analyticsPage");
  const { format } = useAnalyticsView();
  const rows = report.data.slice(0, SHOWN);
  const most = Math.max(...rows.map((row) => Number(row.revenue)), 0);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-3">
      <ListPanel
        className="lg:col-span-2"
        note={t("products.bestNote")}
        tabs={[
          {
            key: "best",
            label: t("products.bestTitle"),
            columns: [
              { label: t("columns.views"), wide: true },
              { label: t("columns.toCart"), wide: true },
              { label: t("columns.sold") },
              { label: t("columns.viewToBuy"), wide: true },
              { label: t("columns.sales") },
            ],
            rows: rows.map((row) => ({
              key: row.product_id,
              label: row.product_name,
              detail: row.category || undefined,
              values: [
                format.count(row.views),
                format.count(row.add_to_cart),
                format.count(row.units),
                row.views ? format.percent(shareOf(row.units, row.views)) : "—",
                format.money(row.revenue),
              ],
              share: shareOf(Number(row.revenue), most),
            })),
          },
        ]}
      />

      <div className="flex flex-col gap-4">
        <ListPanel
          tabs={[
            {
              key: "categories",
              label: t("products.categoriesTitle"),
              columns: [{ label: t("columns.share") }, { label: t("columns.sales") }],
              rows: report.categories.map((row) => ({
                key: row.category || "none",
                label: row.category || t("products.noCategory"),
                values: [format.percent(row.share), format.money(row.sales)],
                share: row.share,
              })),
            },
          ]}
        />

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
