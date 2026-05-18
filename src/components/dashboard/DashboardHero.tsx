"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import DateRangeFilter, { type DateRangeValue } from "@/components/DateRangeFilter";
import DashboardRefreshControl from "@/components/DashboardRefreshControl";
import type { RefreshInterval } from "@/context/DashboardRefreshContext";

interface DashboardHeroProps {
  greeting: string;
  accountName: string;
  lastUpdatedLabel: string | null;
  autoRefreshInterval: RefreshInterval;
  range: DateRangeValue;
  onRangeChange: (value: DateRangeValue) => void;
}

const INTERVAL_LABELS: Record<RefreshInterval, string> = {
  off: "off",
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
};

export default function DashboardHero({
  greeting,
  accountName,
  lastUpdatedLabel,
  autoRefreshInterval,
  range,
  onRangeChange,
}: DashboardHeroProps) {
  const t = useTranslations("dashboard");
  const [datePanelOpen, setDatePanelOpen] = useState(false);

  const metaParts = [
    t("heroMetaOverview"),
    lastUpdatedLabel
      ? t("heroMetaLastUpdated", { when: lastUpdatedLabel })
      : t("heroMetaLastUpdatedUnknown"),
    t("heroMetaAutoRefresh", {
      interval: INTERVAL_LABELS[autoRefreshInterval],
    }),
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[1.65rem] font-medium leading-tight tracking-tight text-foreground sm:text-[1.85rem]">
          {t("title", { greeting, name: accountName })}
        </h1>
        <p className="mt-1 font-numbers text-xs text-muted-foreground sm:text-sm">
          {metaParts.join(" · ")}
        </p>
      </div>
      <div
        className={cn(
          "flex w-full min-w-0 gap-2 sm:w-auto sm:justify-end",
          datePanelOpen ? "max-sm:flex-col" : "max-sm:flex-row"
        )}
      >
        <DateRangeFilter
          value={range}
          onChange={onRangeChange}
          layout="compact"
          onPanelOpenChange={setDatePanelOpen}
          className={cn(
            "min-w-0 border-0 p-0 sm:flex-none",
            datePanelOpen ? "max-sm:w-full" : "flex-1"
          )}
        />
        <DashboardRefreshControl
          compact
          className={cn(
            "min-w-0 sm:flex-none",
            datePanelOpen ? "max-sm:w-full" : "flex-1"
          )}
        />
      </div>
    </div>
  );
}
