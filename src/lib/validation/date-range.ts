import { format, isValid, parseISO, subDays } from "date-fns";
import { z } from "zod";
import type { AnalyticsBucket } from "@/hooks/useDashboardAnalytics";
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

export function normalizeDateRange(raw: DateRangeValue, today: Date): DateRangeValue {
  const parsedEnd = parseISO(raw.endDate);
  const parsedStart = parseISO(raw.startDate);

  let end = isValid(parsedEnd) ? parsedEnd : isValid(parsedStart) ? parsedStart : today;
  if (end > today) {
    end = today;
  }

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
