"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { Empty, Panel, shareOf } from "../_components/kit";
import { useAnalyticsView } from "../_lib/context";
import { worthKnowing } from "../_lib/insights";
import type { DistrictsReport } from "../_lib/types";

type Measure = "orders" | "sales" | "delivered";
/** Districts listed before the rest are summed into one line. */
const LISTED = 10;
export function Districts({ report }: { report: DistrictsReport }) {
  const t = useTranslations("analyticsPage");
  const locale = useLocale();
  const { format } = useAnalyticsView();
  const [measure, setMeasure] = useState<Measure>("orders");
  const [division, setDivision] = useState<string | null>(null);
  const named = (row: { name: string; name_bn: string }) => (locale === "bn" ? row.name_bn : row.name);
  const byKey = Object.fromEntries(report.districts.map((row) => [row.key, row]));

  const value = (row: { orders: number; sales: string; delivered_rate: number }) =>
    measure === "orders" ? row.orders : measure === "sales" ? Number(row.sales) : row.delivered_rate;
  const shown = (row: { orders: number; sales: string; delivered_rate: number }) =>
    measure === "orders" ? format.count(row.orders) : measure === "sales" ? format.money(row.sales) : format.percent(row.delivered_rate);
  const most = Math.max(...report.divisions.map(value), 0);

  const districts = report.districts.filter((row) => !division || row.division === division);
  const listed = districts.slice(0, LISTED);
  const rest = districts.slice(LISTED);
  const note = worthKnowing(report);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={t("districts.divisionsTitle")} note={t("districts.divisionsNote")}>
        <div className="inline-flex self-start rounded-ui border border-border bg-muted/70 p-0.5 text-xs">
          {(["orders", "sales", "delivered"] as Measure[]).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={measure === option}
              onClick={() => setMeasure(option)}
              className={cn(
                "rounded-ui px-2.5 py-1 font-medium",
                measure === option ? "bg-card text-foreground shadow-xs" : "text-muted-foreground",
              )}
            >
              {t(`districts.measure.${option}`)}
            </button>
          ))}
        </div>
        <ul className="flex flex-col gap-2">
          {report.divisions.map((row) => (
            <li key={row.key}>
              <button
                type="button"
                aria-pressed={division === row.key}
                onClick={() => setDivision(division === row.key ? null : row.key)}
                className={cn(
                  "flex w-full flex-col gap-1 rounded-ui px-1.5 py-1 text-left",
                  division === row.key ? "bg-muted" : "hover:bg-muted/60",
                )}
              >
                <span className="flex w-full justify-between gap-3 text-sm">
                  <span className="font-medium text-foreground">{named(row)}</span>
                  <span className="font-semibold text-foreground tabular-nums">{shown(row)}</span>
                </span>
                <span className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${shareOf(value(row), most)}%` }} />
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground">{t("districts.tapDivision")}</p>
      </Panel>

      <div className="flex flex-col gap-3">
        <Panel
          title={division ? named(report.divisions.find((row) => row.key === division)!) : t("districts.listTitle")}
          note={t("districts.listNote")}
        >
          {listed.length ? (
            <ul className="flex flex-col divide-y divide-border">
              {listed.map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{named(row)}</span>
                    <span className="text-xs text-muted-foreground">
                      {named(report.divisions.find((d) => d.key === row.division) ?? { name: row.division, name_bn: row.division })} ·{" "}
                      {format.money(row.sales)} · {t("districts.deliveredRate", { rate: format.percent(row.delivered_rate) })}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-sm font-semibold text-foreground tabular-nums">{t("orderCount", { n: format.count(row.orders) })}</span>
                    <span className={cn("text-xs", row.returned_rate >= 20 ? "font-medium text-rose-700 dark:text-rose-400" : "text-muted-foreground")}>
                      {t("districts.returnedRate", { rate: format.percent(row.returned_rate) })}
                    </span>
                  </div>
                </li>
              ))}
              {rest.length ? (
                <li className="flex items-center justify-between gap-3 py-2.5 last:pb-0">
                  <span className="text-sm font-medium text-foreground">{t("districts.otherDistricts", { n: format.count(rest.length) })}</span>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {t("orderCount", { n: format.count(rest.reduce((sum, row) => sum + row.orders, 0)) })}
                  </span>
                </li>
              ) : null}
            </ul>
          ) : (
            <Empty />
          )}
          {!division && report.not_recognised.orders ? (
            <div className="flex items-center justify-between gap-3 rounded-ui bg-muted px-2.5 py-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{t("districts.notRecognised")}</span>
                <span className="text-xs text-muted-foreground">{t("districts.notRecognisedNote")}</span>
              </div>
              <div className="flex shrink-0 flex-col items-end">
                <span className="text-sm font-semibold text-foreground tabular-nums">{t("orderCount", { n: format.count(report.not_recognised.orders) })}</span>
                <span className="text-xs text-muted-foreground">{format.money(report.not_recognised.sales)}</span>
              </div>
            </div>
          ) : null}
        </Panel>

        {note ? (
          <Panel title={t("districts.worthKnowing")}>
            <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm text-foreground">
              <li>
                {t("districts.topShare", {
                  places: note.top.map((key) => named(byKey[key])).join(", "),
                  share: format.percent(note.topShare),
                })}
              </li>
              {note.returns.length ? (
                <li>
                  {t("districts.mostReturns", {
                    places: note.returns.map((row) => `${named(byKey[row.key])} (${format.percent(row.rate)})`).join(", "),
                  })}
                </li>
              ) : null}
            </ul>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}

