"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import DateRangeFilter, { type DateRangeValue } from "@/components/DateRangeFilter";
import DashboardRefreshControl from "@/components/DashboardRefreshControl";
import { PageHint } from "@/components/page/PageHint";

interface DashboardHeroProps {
  greeting: string;
  /** The person's own first name; empty, and the greeting goes without one. */
  name: string;
  range: DateRangeValue;
  onRangeChange: (value: DateRangeValue) => void;
}

export default function DashboardHero({ greeting, name, range, onRangeChange }: DashboardHeroProps) {
  const t = useTranslations("dashboard");
  const tHints = useTranslations("pageHints");
  const [datePanelOpen, setDatePanelOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <h1 className="text-[1.65rem] font-medium leading-tight tracking-tight text-foreground sm:text-[1.85rem]">
            {name ? t("title", { greeting, name }) : t("titleNoName", { greeting })}
          </h1>
          <PageHint>{tHints("home")}</PageHint>
        </div>
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
