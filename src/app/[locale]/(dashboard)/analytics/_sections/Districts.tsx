"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { DivisionMap } from "../_components/DivisionMap";
import { ListPanel, Panel, shareOf } from "../_components/kit";
import { useAnalyticsView } from "../_lib/context";
import { worthKnowing } from "../_lib/insights";
import type { DistrictsReport } from "../_lib/types";

type Measure = "orders" | "sales" | "delivered";
/** Districts listed before the rest are summed into one line. */
const LISTED = 10;
/** A district returning this share of its parcels is worth a second look. */
const MANY_RETURNS = 20;

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
  const mostOrders = Math.max(...listed.map((row) => row.orders), 0);
  const note = worthKnowing(report);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel title={t("districts.divisionsTitle")} note={t("districts.divisionsNote")}>
        <div className="inline-flex self-start rounded-ui border border-border bg-muted/70 p-0.5 text-xs">
          {(["orders", "sales", "delivered"] as Measure[]).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={measure === option}
              onClick={() => setMeasure(option)}
              className={cn(
                "rounded-ui px-3 py-1.5 font-medium",
                measure === option ? "bg-card text-foreground shadow-xs" : "text-muted-foreground",
              )}
            >
              {t(`districts.measure.${option}`)}
            </button>
          ))}
        </div>
        <DivisionMap
          divisions={report.divisions}
          value={value}
          shown={shown}
          named={named}
          rate={measure === "delivered"}
          selected={division}
          onSelect={setDivision}
        />
        <ul className="flex flex-col">
          {report.divisions.map((row) => (
            <li key={row.key}>
              <button
                type="button"
                aria-pressed={division === row.key}
                onClick={() => setDivision(division === row.key ? null : row.key)}
                className={cn(
                  "relative flex min-h-10 w-full items-center justify-between gap-3 rounded-ui px-2.5 text-left text-[13px]",
                  division === row.key ? "ring-1 ring-inset ring-foreground/25" : "hover:bg-muted/60",
                )}
              >
                <span
                  aria-hidden
                  className="absolute inset-y-1 left-0 rounded-ui bg-blue-500/10 dark:bg-blue-400/15"
                  style={{ width: `${shareOf(value(row), most)}%` }}
                />
                <span className="relative text-foreground">{named(row)}</span>
                <span className="relative font-semibold text-foreground tabular-nums">{shown(row)}</span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="flex flex-col gap-4">
        <ListPanel
          key={division ?? "all"}
          note={t("districts.listNote")}
          tabs={[
            {
              key: "districts",
              label: division ? named(report.divisions.find((row) => row.key === division)!) : t("districts.listTitle"),
              columns: [
                { label: t("columns.orders") },
                { label: t("columns.sales"), wide: true },
                { label: t("columns.delivered") },
                { label: t("columns.returned"), wide: true },
              ],
              rows: [
                ...listed.map((row) => ({
                  key: row.key,
                  label: named(row),
                  values: [
                    format.count(row.orders),
                    format.money(row.sales),
                    format.percent(row.delivered_rate),
                    <span key="returned" className={row.returned_rate >= MANY_RETURNS ? "text-rose-700 dark:text-rose-400" : undefined}>
                      {format.percent(row.returned_rate)}
                    </span>,
                  ],
                  share: shareOf(row.orders, mostOrders),
                })),
                ...(rest.length
                  ? [
                      {
                        key: "rest",
                        label: t("districts.otherDistricts", { n: format.count(rest.length) }),
                        values: [
                          format.count(rest.reduce((sum, row) => sum + row.orders, 0)),
                          format.money(rest.reduce((sum, row) => sum + Number(row.sales), 0)),
                          "—",
                          "—",
                        ],
                        share: 0,
                      },
                    ]
                  : []),
              ],
            },
          ]}
        >
          {!division && report.not_recognised.orders ? (
            <div className="flex items-center justify-between gap-3 rounded-ui bg-muted px-2.5 py-2">
              <div className="flex flex-col">
                <span className="text-[13px] font-medium text-foreground">{t("districts.notRecognised")}</span>
                <span className="text-xs text-muted-foreground">{t("districts.notRecognisedNote")}</span>
              </div>
              <div className="flex shrink-0 flex-col items-end">
                <span className="text-[13px] font-semibold text-foreground tabular-nums">
                  {t("orderCount", { n: format.count(report.not_recognised.orders) })}
                </span>
                <span className="text-xs text-muted-foreground">{format.money(report.not_recognised.sales)}</span>
              </div>
            </div>
          ) : null}
        </ListPanel>

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
