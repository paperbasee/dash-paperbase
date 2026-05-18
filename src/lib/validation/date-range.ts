import { z } from "zod";
import type { AnalyticsBucket } from "@/hooks/useDashboardAnalytics";
import {
  addCalendarDaysYmd,
  isValidYmd,
  todayYmdInBD,
} from "@/utils/time";
import { defaultValidationMessages, type ValidationMessages } from "./messages";

export type PresetKey = "today" | "last7" | "last30" | "thisMonth" | "custom";

export interface DateRangeValue {
  startDate: string;
  endDate: string;
  bucket: AnalyticsBucket;
  preset: PresetKey;
}

export function buildDateRangeInputSchema(messages: ValidationMessages = defaultValidationMessages) {
  return z.object({
    startDate: z.string().trim().min(1, messages.startDateRequired),
    endDate: z.string().trim().min(1, messages.endDateRequired),
    bucket: z.enum(["hour", "day", "week", "month"]),
    preset: z.enum(["today", "last7", "last30", "thisMonth", "custom"]),
  });
}

export const dateRangeInputSchema = buildDateRangeInputSchema();

export function normalizeDateRange(raw: DateRangeValue, anchorDate: Date): DateRangeValue {
  const todayStr = todayYmdInBD(anchorDate);

  let endStr = isValidYmd(raw.endDate)
    ? raw.endDate.trim()
    : isValidYmd(raw.startDate)
      ? raw.startDate.trim()
      : todayStr;
  if (endStr > todayStr) {
    endStr = todayStr;
  }

  const minStartStr = addCalendarDaysYmd(endStr, -90);
  let startStr = isValidYmd(raw.startDate) ? raw.startDate.trim() : endStr;
  if (startStr < minStartStr) {
    startStr = minStartStr;
  }
  if (startStr > endStr) {
    startStr = endStr;
  }

  let bucket: AnalyticsBucket = raw.bucket;
  if (startStr === endStr) {
    bucket = "hour";
  } else if (bucket === "hour") {
    bucket = "day";
  }

  return {
    ...raw,
    startDate: startStr,
    endDate: endStr,
    bucket,
  };
}

function inclusiveDayCount(startYmd: string, endYmd: string): number {
  const [ys, ms, ds] = startYmd.split("-").map(Number);
  const [ye, me, de] = endYmd.split("-").map(Number);
  const start = Date.UTC(ys, ms - 1, ds);
  const end = Date.UTC(ye, me - 1, de);
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

/** Shift the current window backward/forward by its length (Grafana-style). */
export function shiftDateRange(
  value: DateRangeValue,
  direction: -1 | 1,
  anchorDate: Date
): DateRangeValue {
  const todayStr = todayYmdInBD(anchorDate);
  const span = inclusiveDayCount(value.startDate, value.endDate);
  const delta = direction * span;
  let endStr = addCalendarDaysYmd(value.endDate, delta);
  let startStr = addCalendarDaysYmd(value.startDate, delta);

  if (endStr > todayStr) {
    endStr = todayStr;
    startStr = addCalendarDaysYmd(endStr, -(span - 1));
  }

  const minStartStr = addCalendarDaysYmd(todayStr, -90);
  if (startStr < minStartStr) {
    startStr = minStartStr;
    endStr = addCalendarDaysYmd(startStr, span - 1);
    if (endStr > todayStr) {
      endStr = todayStr;
    }
  }

  return normalizeDateRange(
    {
      ...value,
      startDate: startStr,
      endDate: endStr,
      preset: "custom",
    },
    anchorDate
  );
}

export function canShiftDateRangeForward(
  value: DateRangeValue,
  anchorDate: Date
): boolean {
  return value.endDate < todayYmdInBD(anchorDate);
}
