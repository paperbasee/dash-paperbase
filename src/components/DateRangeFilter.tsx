"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Card, CardContent } from "./ui/card";
import { InputGroup, InputGroupInput } from "./ui/input-group";
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
            <div ref={startPickerRef} className="relative">
              <InputGroup
                className="h-8 w-[120px] shrink-0 cursor-pointer sm:w-[110px]"
                onClick={() => setStartPickerOpen((open) => !open)}
              >
                <InputGroupInput
                  readOnly
                  placeholder={t("filtersDatePlaceholder")}
                  className={cn("font-numbers-date-value cursor-pointer")}
                  value={value.startDate}
                />
              </InputGroup>
              {startPickerOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-fit max-w-[calc(100vw-2rem)]">
                  <div className="rounded-card border border-border bg-card p-1 shadow-lg">
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
              <InputGroup
                className="h-8 w-[120px] shrink-0 cursor-pointer sm:w-[110px]"
                onClick={() => setEndPickerOpen((open) => !open)}
              >
                <InputGroupInput
                  readOnly
                  placeholder={t("filtersDatePlaceholder")}
                  className={cn("font-numbers-date-value cursor-pointer")}
                  value={value.endDate}
                />
              </InputGroup>
              {endPickerOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-fit max-w-[calc(100vw-2rem)]">
                  <div className="rounded-card border border-border bg-card p-1 shadow-lg">
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
      </CardContent>
    </Card>
  );
}

export type { DateRangeValue, PresetKey } from "@/lib/validation";
