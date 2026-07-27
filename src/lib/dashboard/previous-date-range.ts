import type { DateRangeValue } from "@/lib/validation/date-range";
import { addCalendarDaysYmd, isValidYmd } from "@/utils/time";

/** Previous period of equal length immediately before the current range. */
export function getPreviousDateRange(range: DateRangeValue): DateRangeValue {
  const { startDate, endDate, bucket, preset } = range;

  // Sub-day (ISO instant) ranges: shift the exact window back by its own span.
  if (!isValidYmd(startDate) || !isValidYmd(endDate)) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const spanMs = end.getTime() - start.getTime();
    return {
      startDate: new Date(start.getTime() - spanMs).toISOString(),
      endDate: start.toISOString(),
      bucket,
      preset,
    };
  }

  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const daySpan =
    Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);

  const prevEnd = addCalendarDaysYmd(startDate, -1);
  const prevStart = addCalendarDaysYmd(prevEnd, -(daySpan - 1));

  return {
    startDate: prevStart,
    endDate: prevEnd,
    bucket: daySpan === 1 ? "hour" : bucket === "hour" ? "day" : bucket,
    preset,
  };
}
