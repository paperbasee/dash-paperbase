"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import type { AnalyticsBucket } from "@/hooks/useDashboardAnalytics";
import { digitsInNumberFont } from "@/lib/number-font";
import {
  dateRangeInputSchema,
  normalizeDateRange,
  type DateRangeValue,
  type PresetKey,
} from "@/lib/validation";
import {
  addCalendarDaysYmd,
  startOfMonthYmdInBD,
  todayYmdInBD,
} from "@/utils/time";

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

export default function DateRangeFilter({
  value,
  onChange,
}: DateRangeFilterProps) {
  const locale = useLocale();
  const t = useTranslations("pages");
  const today = useMemo(() => new Date(), []);

  const setPreset = (preset: PresetKey) => {
    const endStr = todayYmdInBD(today);
    let startStr = endStr;
    let bucket: AnalyticsBucket = "day";

    if (preset === "last7") {
      startStr = addCalendarDaysYmd(endStr, -6);
      bucket = "day";
    } else if (preset === "last30") {
      startStr = addCalendarDaysYmd(endStr, -29);
      bucket = "day";
    } else if (preset === "thisMonth") {
      startStr = startOfMonthYmdInBD(today);
      bucket = "day";
    } else if (preset === "today") {
      startStr = endStr;
      bucket = "day";
    } else {
      // custom – keep existing dates/bucket
      onChange({ ...value, preset });
      return;
    }

    const base: DateRangeValue = {
      startDate: startStr,
      endDate: endStr,
      bucket,
      preset,
    };

    onChange(normalizeDateRange(base, today));
  };

  const handleDateInput = (field: "startDate" | "endDate", val: string) => {
    const cleaned = val.trim();
    if (!cleaned) return;

    // Let the user type partial values without forcing normalization.
    if (cleaned.length < 10) {
      onChange({
        ...value,
        [field]: cleaned,
        preset: "custom",
      });
      return;
    }

    const next: DateRangeValue = {
      ...value,
      [field]: cleaned,
      preset: "custom",
    };
    const parsed = dateRangeInputSchema.safeParse(next);
    if (!parsed.success) {
      return;
    }
    onChange(normalizeDateRange(parsed.data, today));
  };

  return (
    <Card className="border-none bg-transparent shadow-none">
      <CardContent className="flex flex-col gap-3 px-0 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:flex lg:flex-wrap">
          <Button
            size="sm"
            variant={value.preset === "today" ? "default" : "outline"}
            className="w-full lg:w-auto"
            onClick={() => setPreset("today")}
          >
            {digitsInNumberFont(t("filtersToday"), locale)}
          </Button>
          <Button
            size="sm"
            variant={value.preset === "last7" ? "default" : "outline"}
            className="w-full lg:w-auto"
            onClick={() => setPreset("last7")}
          >
            {digitsInNumberFont(t("filtersLast7Days"), locale)}
          </Button>
          <Button
            size="sm"
            variant={value.preset === "last30" ? "default" : "outline"}
            className="w-full lg:w-auto"
            onClick={() => setPreset("last30")}
          >
            {digitsInNumberFont(t("filtersLast30Days"), locale)}
          </Button>
          <Button
            size="sm"
            variant={value.preset === "thisMonth" ? "default" : "outline"}
            className="w-full lg:w-auto"
            onClick={() => setPreset("thisMonth")}
          >
            {digitsInNumberFont(t("filtersThisMonth"), locale)}
          </Button>
        </div>

        <div className="flex flex-col gap-2 text-xs sm:text-sm lg:flex-row lg:items-center lg:gap-3 lg:flex-nowrap">
          <span className="text-muted-foreground whitespace-nowrap">
            {t("filtersCustomRange")}
          </span>
          <div className="flex items-center gap-2 lg:contents">
            <Input
              type="text"
              inputMode="numeric"
              placeholder={t("filtersDatePlaceholder")}
              className="font-numbers-date-value h-8 w-[120px] sm:w-[110px]"
              value={value.startDate}
              onChange={(e) => handleDateInput("startDate", e.target.value)}
            />
            <span className="text-muted-foreground whitespace-nowrap">
              {t("filtersDateRangeTo")}
            </span>
            <Input
              type="text"
              inputMode="numeric"
              placeholder={t("filtersDatePlaceholder")}
              className="font-numbers-date-value h-8 w-[120px] sm:w-[110px]"
              value={value.endDate}
              onChange={(e) => handleDateInput("endDate", e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export type { DateRangeValue, PresetKey } from "@/lib/validation";
