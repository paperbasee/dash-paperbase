import type { AnalyticsBucket } from "@/lib/basicAnalyticsService";
import type { DateRangeValue, PresetKey } from "@/lib/validation";
import { addCalendarDaysYmd, todayYmdInBD } from "@/utils/time";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

function dayRange(
  startDate: string,
  endDate: string,
  bucket: AnalyticsBucket,
  preset: PresetKey
): DateRangeValue {
  return { startDate, endDate, bucket, preset };
}

function lastMinutes(now: Date, n: number, preset: PresetKey): DateRangeValue {
  return {
    startDate: new Date(now.getTime() - n * MINUTE_MS).toISOString(),
    endDate: now.toISOString(),
    bucket: "minute",
    preset,
  };
}

function lastHours(now: Date, n: number, preset: PresetKey): DateRangeValue {
  return {
    startDate: new Date(now.getTime() - n * HOUR_MS).toISOString(),
    endDate: now.toISOString(),
    bucket: "hour",
    preset,
  };
}

export interface PresetDef {
  key: PresetKey;
  labelKey: string;
  /** Shown in DateRangeFilter's compact button row. */
  common?: boolean;
  resolve: (now: Date) => DateRangeValue;
}

export const PRESET_DEFS: PresetDef[] = [
  { key: "last5m", labelKey: "filtersLast5Minutes", resolve: (now) => lastMinutes(now, 5, "last5m") },
  { key: "last10m", labelKey: "filtersLast10Minutes", resolve: (now) => lastMinutes(now, 10, "last10m") },
  { key: "last15m", labelKey: "filtersLast15Minutes", resolve: (now) => lastMinutes(now, 15, "last15m") },
  { key: "last30m", labelKey: "filtersLast30Minutes", resolve: (now) => lastMinutes(now, 30, "last30m") },
  { key: "last1h", labelKey: "filtersLast1Hour", resolve: (now) => lastHours(now, 1, "last1h") },
  { key: "last3h", labelKey: "filtersLast3Hours", resolve: (now) => lastHours(now, 3, "last3h") },
  { key: "last6h", labelKey: "filtersLast6Hours", resolve: (now) => lastHours(now, 6, "last6h") },
  { key: "last12h", labelKey: "filtersLast12Hours", resolve: (now) => lastHours(now, 12, "last12h") },
  { key: "last24h", labelKey: "filtersLast24Hours", resolve: (now) => lastHours(now, 24, "last24h") },
  {
    key: "today",
    labelKey: "filtersToday",
    resolve: (now) => {
      const d = todayYmdInBD(now);
      return dayRange(d, d, "hour", "today");
    },
  },
  {
    key: "last2d",
    labelKey: "filtersLast2Days",
    resolve: (now) => {
      const end = todayYmdInBD(now);
      return dayRange(addCalendarDaysYmd(end, -1), end, "day", "last2d");
    },
  },
  {
    key: "last7",
    labelKey: "filtersLast7Days",
    common: true,
    resolve: (now) => {
      const end = todayYmdInBD(now);
      return dayRange(addCalendarDaysYmd(end, -6), end, "day", "last7");
    },
  },
  {
    key: "last30",
    labelKey: "filtersLast30Days",
    common: true,
    resolve: (now) => {
      const end = todayYmdInBD(now);
      return dayRange(addCalendarDaysYmd(end, -29), end, "day", "last30");
    },
  },
  {
    key: "last90d",
    labelKey: "filtersLast90Days",
    resolve: (now) => {
      const end = todayYmdInBD(now);
      return dayRange(addCalendarDaysYmd(end, -89), end, "day", "last90d");
    },
  },
];

const PRESET_DEFS_BY_KEY = new Map(PRESET_DEFS.map((def) => [def.key, def]));

export function resolvePreset(key: PresetKey, now: Date): DateRangeValue | undefined {
  return PRESET_DEFS_BY_KEY.get(key)?.resolve(now);
}

export const COMMON_PRESET_DEFS = PRESET_DEFS.filter((def) => def.common);
