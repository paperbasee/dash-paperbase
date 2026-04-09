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
    bucket: z.enum(["day", "week", "month"]),
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

  return {
    ...raw,
    startDate: startStr,
    endDate: endStr,
  };
}
