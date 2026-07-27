import { z } from "zod";
import type { AnalyticsBucket } from "@/lib/basicAnalyticsService";
import {
  addCalendarDaysYmd,
  isValidYmd,
  todayYmdInBD,
} from "@/utils/time";
import { defaultValidationMessages, type ValidationMessages } from "./messages";

export const PRESET_KEYS = [
  "last7",
  "last30",
  "custom",
  "last5m",
  "last10m",
  "last15m",
  "last30m",
  "last1h",
  "last3h",
  "last6h",
  "last12h",
  "last24h",
  "last2d",
  "last90d",
] as const;

export type PresetKey = (typeof PRESET_KEYS)[number];

/** Furthest back an absolute/day-granularity range may reach. */
export const MAX_LOOKBACK_DAYS = 90;

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
    bucket: z.enum(["minute", "hour", "day", "week", "month"]),
    preset: z.enum(PRESET_KEYS),
  });
}

export const dateRangeInputSchema = buildDateRangeInputSchema();

export function normalizeDateRange(raw: DateRangeValue, anchorDate: Date): DateRangeValue {
  // Sub-day presets carry full ISO instants rather than YYYY-MM-DD strings;
  // they're always freshly computed from "now" so there's nothing to clamp.
  if (!isValidYmd(raw.startDate) || !isValidYmd(raw.endDate)) {
    return raw;
  }

  const todayStr = todayYmdInBD(anchorDate);

  let endStr = isValidYmd(raw.endDate)
    ? raw.endDate.trim()
    : isValidYmd(raw.startDate)
      ? raw.startDate.trim()
      : todayStr;
  if (endStr > todayStr) {
    endStr = todayStr;
  }

  const minStartStr = addCalendarDaysYmd(endStr, -MAX_LOOKBACK_DAYS);
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
  } else if (bucket === "hour" || bucket === "minute") {
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
  // Sub-day (ISO instant) ranges aren't shiftable — see canShiftDateRangeForward.
  if (!isValidYmd(value.startDate) || !isValidYmd(value.endDate)) {
    return value;
  }

  const todayStr = todayYmdInBD(anchorDate);
  const span = inclusiveDayCount(value.startDate, value.endDate);
  const delta = direction * span;
  let endStr = addCalendarDaysYmd(value.endDate, delta);
  let startStr = addCalendarDaysYmd(value.startDate, delta);

  if (endStr > todayStr) {
    endStr = todayStr;
    startStr = addCalendarDaysYmd(endStr, -(span - 1));
  }

  const minStartStr = addCalendarDaysYmd(todayStr, -MAX_LOOKBACK_DAYS);
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
  if (!isValidYmd(value.endDate)) return false;
  return value.endDate < todayYmdInBD(anchorDate);
}
