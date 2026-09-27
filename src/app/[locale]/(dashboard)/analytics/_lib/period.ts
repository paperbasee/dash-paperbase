import { addCalendarDaysYmd, todayYmdInBD } from "@/utils/time";

/**
 * The days a report covers and what they are compared with -- the API's own
 * rule (api-paperbase analytics/periods.py), kept in the address bar so a
 * reload or a shared link shows the same numbers.
 */
export const PRESETS = ["today", "yesterday", "7", "30", "month"] as const;
export type Preset = (typeof PRESETS)[number];
export type Compare = "previous" | "year";

export type Period =
  | { preset: Preset; compare: Compare }
  | { preset: "custom"; start: string; end: string; compare: Compare };

/** What the page opens on, as the API does when asked for nothing. */
export const DEFAULT_PRESET: Preset = "7";
/** The longest a custom period may run, as the API allows. */
export const MAX_DAYS = 366;

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function periodFromParams(params: URLSearchParams): Period {
  const compare: Compare = params.get("compare") === "year" ? "year" : "previous";
  const start = params.get("start_date") ?? "";
  const end = params.get("end_date") ?? "";
  if (YMD.test(start) && YMD.test(end) && start <= end && end <= todayYmdInBD()) {
    return { preset: "custom", start, end, compare };
  }
  const asked = params.get("range") as Preset | null;
  const preset: Preset = asked && PRESETS.includes(asked) ? asked : DEFAULT_PRESET;
  return { preset, compare };
}

/** The period as query parameters -- for the address bar and for the API alike. */
export function periodParams(period: Period): Record<string, string> {
  if (period.preset === "custom") {
    return { start_date: period.start, end_date: period.end, compare: period.compare };
  }
  return { range: period.preset, compare: period.compare };
}

export function periodQuery(period: Period): string {
  return new URLSearchParams(periodParams(period)).toString();
}

/** The first and last day a period covers, in Bangladesh time. */
export function periodDays(period: Period, today: string = todayYmdInBD()): { start: string; end: string } {
  switch (period.preset) {
    case "custom":
      return { start: period.start, end: period.end };
    case "today":
      return { start: today, end: today };
    case "yesterday": {
      const day = addCalendarDaysYmd(today, -1);
      return { start: day, end: day };
    }
    case "month":
      return { start: `${today.slice(0, 8)}01`, end: today };
    default:
      return { start: addCalendarDaysYmd(today, -(Number(period.preset) - 1)), end: today };
  }
}

export function dayCount(start: string, end: string): number {
  const [a, b] = [start, end].map((ymd) => Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)));
  return Math.round((b - a) / 86_400_000) + 1;
}
