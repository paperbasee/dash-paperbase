"use client";

import type { ComponentType } from "react";

import type { AnalyticsMetricKey, DeltaMode } from "./types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocale, useTranslations } from "next-intl";

function DeltaBadge({
  value,
  label,
  unit,
  lowerIsBetter,
}: {
  value: number | null;
  label: string;
  unit: string;
  lowerIsBetter: boolean;
}) {
  if (value === null || Number.isNaN(value)) {
    return <div className="mt-2 text-xs text-muted-foreground">— {label}</div>;
  }
  const up = value >= 0;
  // A bounce or return rate going up is bad news, whatever the arrow says.
  const good = value === 0 ? null : lowerIsBetter ? !up : up;
  const cls =
    good === null
      ? "text-muted-foreground"
      : good
        ? "text-emerald-700 dark:text-emerald-300"
        : "text-rose-700 dark:text-rose-300";
  const arrow = up ? "↑" : "↓";
  return (
    <div className={`mt-2 text-xs ${cls}`}>
      {arrow} {Math.abs(value).toFixed(1)}
      {unit} {label}
    </div>
  );
}

export function MetricCard({
  title,
  value,
  mom,
  yoy,
  deltaMode,
  icon: Icon,
  metricKey,
  unit,
  lowerIsBetter = false,
}: {
  title: string;
  value: string;
  mom: number | null;
  yoy: number | null;
  deltaMode: DeltaMode;
  icon?: ComponentType<{ className?: string }>;
  metricKey: AnalyticsMetricKey;
  /** "points" for a rate: the change is shown in percentage points. */
  unit?: "points";
  /** A rate where going up is bad (bounce, returns). */
  lowerIsBetter?: boolean;
}) {
  const locale = useLocale();
  const tMetrics = useTranslations("analyticsPage.metrics");
  const tDelta = useTranslations("analyticsPage.delta");
  const deltaValue = deltaMode === "mom" ? mom : yoy;
  const deltaLabel = deltaMode === "mom" ? tDelta("vsPrevious") : tDelta("vsLastYear");
  const deltaUnit = unit === "points" ? ` ${tDelta("points")}` : "%";
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <div
          className="relative rounded-card border border-card-border bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          tabIndex={0}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-muted-foreground">
                <span className="min-w-0 truncate">{title}</span>
              </div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
              <DeltaBadge value={deltaValue} label={deltaLabel} unit={deltaUnit} lowerIsBetter={lowerIsBetter} />
            </div>
            {Icon ? (
              <div className="p-2 text-muted-foreground">
                <Icon className="h-5 w-5" />
              </div>
            ) : null}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8} variant="light">
        <p lang={locale === "bn" ? "bn" : "en"} className="leading-relaxed text-balance">
          {tMetrics(metricKey)}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
