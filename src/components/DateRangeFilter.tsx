"use client";

import { useMemo } from "react";
import {
  addDays,
  format,
  parseISO,
  startOfMonth,
  subDays,
  isValid,
} from "date-fns";
import { AnalyticsBucket } from "@/hooks/useDashboardAnalytics";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";

type PresetKey = "today" | "last7" | "last30" | "thisMonth" | "custom";

export interface DateRangeValue {
  startDate: string;
  endDate: string;
  bucket: AnalyticsBucket;
  preset: PresetKey;
}

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

function normalizeRange(raw: DateRangeValue, today: Date): DateRangeValue {
  // Clamp end date to not be in the future (relative to real today).
  const parsedEnd = parseISO(raw.endDate);
  const parsedStart = parseISO(raw.startDate);

  let end = isValid(parsedEnd)
    ? parsedEnd
    : isValid(parsedStart)
      ? parsedStart
      : today;

  if (end > today) {
    end = today;
  }

  // Start date must be within 90 days before the (clamped) end date.
  const minStart = subDays(end, 90);

  let start = isValid(parsedStart) ? parsedStart : end;

  if (start < minStart) {
    start = minStart;
  }

  if (start > end) {
    start = end;
  }

  return {
    ...raw,
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  };
}

export default function DateRangeFilter({
  value,
  onChange,
}: DateRangeFilterProps) {
  const today = useMemo(() => new Date(), []);

  const setPreset = (preset: PresetKey) => {
    const end = today;
    let start = end;
    let bucket: AnalyticsBucket = "day";

    if (preset === "last7") {
      start = addDays(end, -6);
      bucket = "day";
    } else if (preset === "last30") {
      start = addDays(end, -29);
      bucket = "day";
    } else if (preset === "thisMonth") {
      start = startOfMonth(end);
      bucket = "day";
    } else if (preset === "today") {
      start = end;
      bucket = "day";
    } else {
      // custom – keep existing dates/bucket
      onChange({ ...value, preset });
      return;
    }

    const base: DateRangeValue = {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
      bucket,
      preset,
    };

    onChange(normalizeRange(base, today));
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

    onChange(normalizeRange(next, today));
  };

  return (
    <Card className="border-none bg-transparent shadow-none">
      <CardContent className="flex flex-col gap-3 px-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={value.preset === "today" ? "default" : "outline"}
            onClick={() => setPreset("today")}
          >
            Today
          </Button>
          <Button
            size="sm"
            variant={value.preset === "last7" ? "default" : "outline"}
            onClick={() => setPreset("last7")}
          >
            Last 7 days
          </Button>
          <Button
            size="sm"
            variant={value.preset === "last30" ? "default" : "outline"}
            onClick={() => setPreset("last30")}
          >
            Last 30 days
          </Button>
          <Button
            size="sm"
            variant={value.preset === "thisMonth" ? "default" : "outline"}
            onClick={() => setPreset("thisMonth")}
          >
            This month
          </Button>
        </div>

        <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:gap-3 sm:text-sm sm:flex-nowrap">
          <span className="text-muted-foreground whitespace-nowrap">
            Custom range:
          </span>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="YYYY-MM-DD"
            className="h-8 w-[120px] sm:w-[110px]"
            value={value.startDate}
            onChange={(e) => handleDateInput("startDate", e.target.value)}
          />
          <span className="text-muted-foreground whitespace-nowrap">to</span>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="YYYY-MM-DD"
            className="h-8 w-[120px] sm:w-[110px]"
            value={value.endDate}
            onChange={(e) => handleDateInput("endDate", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

