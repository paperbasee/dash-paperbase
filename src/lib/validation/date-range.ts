import { format, isValid, parseISO, subDays } from "date-fns";
import { z } from "zod";
import type { AnalyticsBucket } from "@/hooks/useDashboardAnalytics";

export type PresetKey = "today" | "last7" | "last30" | "thisMonth" | "custom";

export interface DateRangeValue {
  startDate: string;
  endDate: string;
  bucket: AnalyticsBucket;
  preset: PresetKey;
}

export const dateRangeInputSchema = z.object({
  startDate: z.string().trim().min(1, "Start date is required."),
  endDate: z.string().trim().min(1, "End date is required."),
  bucket: z.enum(["day", "week", "month"]),
  preset: z.enum(["today", "last7", "last30", "thisMonth", "custom"]),
});

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
