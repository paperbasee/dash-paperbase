"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { AlertCircle, PackageCheck, Percent, Truck, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { RechartsSizedContainer } from "@/components/RechartsSizedContainer";
import { PARCEL_SLICE_COLORS } from "./constants";
import type { ParcelsData, PieSlice } from "./types";

export function ParcelStatusCard({ parcelsData }: { parcelsData: ParcelsData | null }) {
  const tParcel = useTranslations("analyticsPage.parcelStatus");

  const parcelPie = useMemo((): PieSlice[] => {
    const s = parcelsData?.summary;
    return [
      { name: "Delivered", key: "delivered", value: s?.delivered ?? 0 },
      { name: "Returned", key: "returned", value: s?.returned ?? 0 },
      { name: "In transit", key: "in_transit", value: s?.in_transit ?? 0 },
      { name: "Unknown", key: "unknown", value: s?.unknown ?? 0 },
    ];
  }, [parcelsData]);

  const parcelInsights = useMemo(() => {
    const total = parcelPie.reduce((s, d) => s + d.value, 0);
    const sorted = [...parcelPie].sort((a, b) => b.value - a.value);
    const top = sorted[0];
    const topPctRaw = total > 0 && top ? (top.value / total) * 100 : 0;
    const topPct = Math.round(topPctRaw * 10) / 10;
    return { total, sorted, top, topPct };
  }, [parcelPie]);

  const parcelSliceLabel = (key: string) =>
    key === "returned"
      ? tParcel("names.returned")
      : key === "in_transit"
        ? tParcel("names.in_transit")
        : key === "unknown"
          ? tParcel("names.unknown")
          : tParcel("names.delivered");

  const donutBlendFullCircle =
    parcelInsights.total > 0 && parcelPie.filter((s) => s.value > 0).length <= 1;

  return (
    <div className="rounded-xl border border-border/80 bg-card p-5 shadow-[0_4px_24px_-6px_rgba(15,23,42,0.08)] lg:col-span-2 dark:border-border dark:shadow-none">
      <div className="mb-6 flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight text-foreground">{tParcel("title")}</h3>
      </div>

      {parcelInsights.total === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm text-muted-foreground">{tParcel("empty")}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-stretch gap-8 lg:flex-row lg:items-center lg:gap-10">
            <div className="relative mx-auto h-[208px] w-[208px] shrink-0 lg:mx-0 lg:h-[220px] lg:w-[220px]">
              <RechartsSizedContainer className="h-full w-full lg:min-h-[220px]" style={{ minHeight: 208 }}>
                {({ width, height }) => (
              <ResponsiveContainer
                width={width}
                height={height}
                minWidth={0}
                minHeight={208}
                initialDimension={{ width: 220, height: 220 }}
              >
                <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <Pie
                    data={parcelPie}
                    dataKey="value"
                    nameKey="key"
                    innerRadius="58%"
                    outerRadius="92%"
                    paddingAngle={donutBlendFullCircle ? 0 : 2}
                    cornerRadius={donutBlendFullCircle ? 0 : 6}
                    stroke={donutBlendFullCircle ? "none" : "hsl(var(--card))"}
                    strokeWidth={donutBlendFullCircle ? 0 : 3}
                  >
                    {parcelPie.map((entry) => (
                      <Cell key={entry.key} fill={PARCEL_SLICE_COLORS[entry.key] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
                )}
              </RechartsSizedContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <span className="text-[1.65rem] font-bold leading-none tracking-tight text-foreground tabular-nums">
                  {parcelInsights.top?.value.toLocaleString() ?? 0}
                </span>
                <span className="mt-2 max-w-[9rem] text-[11px] leading-snug text-muted-foreground">
                  {tParcel("ofParcels", {
                    count: parcelInsights.total.toLocaleString(),
                  })}
                </span>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-center gap-4">
              {parcelInsights.sorted.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-4 border-b border-border/50 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="size-2.5 shrink-0 rounded-full ring-2 ring-background"
                      style={{
                        backgroundColor: PARCEL_SLICE_COLORS[row.key] ?? "#94a3b8",
                      }}
                      aria-hidden
                    />
                    <span className="truncate text-sm text-muted-foreground">{parcelSliceLabel(row.key)}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {row.value.toLocaleString()}
                    </span>
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      {tParcel("parcelsShort")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/70 bg-muted/25 p-4 dark:bg-muted/15">
              <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                  {parcelInsights.top?.key === "returned" ? (
                    <Undo2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  ) : parcelInsights.top?.key === "in_transit" ? (
                    <Truck className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  ) : parcelInsights.top?.key === "unknown" ? (
                    <AlertCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  ) : (
                    <PackageCheck className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className="truncate">{tParcel("leadingLabel")}</span>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                  {parcelInsights.topPct}%
                </span>
              </div>
              <p className="pt-3 text-xs leading-relaxed text-muted-foreground">
                {parcelInsights.top
                  ? tParcel("leadingDescription", {
                      status: parcelSliceLabel(parcelInsights.top.key),
                      percent: parcelInsights.topPct,
                    })
                  : null}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/25 p-4 dark:bg-muted/15">
              <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                  <Percent className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">{tParcel("returnRateLabel")}</span>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                  {(parcelsData?.return_rate ?? 0).toFixed(1)}%
                </span>
              </div>
              <p className="pt-3 text-xs leading-relaxed text-muted-foreground">
                {tParcel("returnRateDescription")}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
