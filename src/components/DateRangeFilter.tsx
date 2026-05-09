"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { AnalyticsBucket } from "@/hooks/useDashboardAnalytics";
import { digitsInNumberFont } from "@/lib/number-font";
import { cn } from "@/lib/utils";
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

const Calendar = dynamic(
  () => import("./ui/calendar").then((mod) => mod.Calendar),
  {
    ssr: false,
    loading: () => <div className="h-56 w-64 animate-pulse rounded-xs bg-muted/40" />,
  }
);

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

function ymdToDate(ymd: string): Date | undefined {
  const m = ymd.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return undefined;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function dateToYmd(date: Date): string {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function DateRangeFilter({
  value,
  onChange,
}: DateRangeFilterProps) {
  const locale = useLocale();
  const t = useTranslations("pages");
  const today = useMemo(() => new Date(), []);
  const todayDate = useMemo(() => startOfDay(today), [today]);
  const minDate = useMemo(() => {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - 90);
    return d;
  }, [todayDate]);
  const selectedStart = ymdToDate(value.startDate);
  const selectedEnd = ymdToDate(value.endDate);
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);
  const startPickerRef = useRef<HTMLDivElement | null>(null);
  const endPickerRef = useRef<HTMLDivElement | null>(null);

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
      bucket = "hour";
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (startPickerRef.current && !startPickerRef.current.contains(target)) {
        setStartPickerOpen(false);
      }
      if (endPickerRef.current && !endPickerRef.current.contains(target)) {
        setEndPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:flex lg:flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "w-full lg:w-auto",
              value.preset === "today" &&
                "bg-accent text-foreground border-border hover:bg-accent/80 dark:bg-white/[0.08] dark:text-white dark:border-white/[0.12] dark:hover:bg-white/[0.12]"
            )}
            onClick={() => setPreset("today")}
          >
            {digitsInNumberFont(t("filtersToday"), locale)}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "w-full lg:w-auto",
              value.preset === "last7" &&
                "bg-accent text-foreground border-border hover:bg-accent/80 dark:bg-white/[0.08] dark:text-white dark:border-white/[0.12] dark:hover:bg-white/[0.12]"
            )}
            onClick={() => setPreset("last7")}
          >
            {digitsInNumberFont(t("filtersLast7Days"), locale)}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "w-full lg:w-auto",
              value.preset === "last30" &&
                "bg-accent text-foreground border-border hover:bg-accent/80 dark:bg-white/[0.08] dark:text-white dark:border-white/[0.12] dark:hover:bg-white/[0.12]"
            )}
            onClick={() => setPreset("last30")}
          >
            {digitsInNumberFont(t("filtersLast30Days"), locale)}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "w-full lg:w-auto",
              value.preset === "thisMonth" &&
                "bg-accent text-foreground border-border hover:bg-accent/80 dark:bg-white/[0.08] dark:text-white dark:border-white/[0.12] dark:hover:bg-white/[0.12]"
            )}
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
            <div ref={startPickerRef} className="relative">
              <Input
                readOnly
                placeholder={t("filtersDatePlaceholder")}
                className={cn(
                  "h-8 w-[122px] shrink-0 cursor-pointer bg-input-surface sm:w-[110px]",
                  "font-numbers-date-value"
                )}
                value={value.startDate}
                onClick={() => setStartPickerOpen((open) => !open)}
              />
              {startPickerOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-fit max-w-[calc(100vw-2rem)]">
                  <div className="rounded-xs border border-border bg-card p-1 shadow-lg">
                    <Calendar
                      mode="single"
                      selected={ymdToDate(value.startDate)}
                      disabled={(date) => {
                        const day = startOfDay(date);
                        if (day < minDate || day > todayDate) return true;
                        if (selectedEnd && day > startOfDay(selectedEnd)) return true;
                        return false;
                      }}
                      onSelect={(date) => {
                        if (!date) return;
                        handleDateInput("startDate", dateToYmd(date));
                        setStartPickerOpen(false);
                      }}
                      className="[--cell-size:--spacing(7)] sm:[--cell-size:--spacing(8)]"
                    />
                  </div>
                </div>
              )}
            </div>
            <span className="text-muted-foreground whitespace-nowrap">
              {t("filtersDateRangeTo")}
            </span>
            <div ref={endPickerRef} className="relative">
              <Input
                readOnly
                placeholder={t("filtersDatePlaceholder")}
                className={cn(
                  "h-8 w-[122px] shrink-0 cursor-pointer bg-input-surface sm:w-[110px]",
                  "font-numbers-date-value"
                )}
                value={value.endDate}
                onClick={() => setEndPickerOpen((open) => !open)}
              />
              {endPickerOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-fit max-w-[calc(100vw-2rem)]">
                  <div className="rounded-xs border border-border bg-card p-1 shadow-lg">
                    <Calendar
                      mode="single"
                      selected={ymdToDate(value.endDate)}
                      disabled={(date) => {
                        const day = startOfDay(date);
                        if (day < minDate || day > todayDate) return true;
                        if (selectedStart && day < startOfDay(selectedStart)) return true;
                        return false;
                      }}
                      onSelect={(date) => {
                        if (!date) return;
                        handleDateInput("endDate", dateToYmd(date));
                        setEndPickerOpen(false);
                      }}
                      className="[--cell-size:--spacing(7)] sm:[--cell-size:--spacing(8)]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}

export type { DateRangeValue, PresetKey } from "@/lib/validation";
