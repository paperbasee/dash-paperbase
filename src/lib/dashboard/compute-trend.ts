export type TrendDirection = "up" | "down" | "flat";

export interface TrendResult {
  direction: TrendDirection;
  percent: number;
}

export function computeTrend(current: number, previous: number): TrendResult {
  if (previous === 0 && current === 0) {
    return { direction: "flat", percent: 0 };
  }
  if (previous === 0) {
    return { direction: "up", percent: 100 };
  }
  const raw = ((current - previous) / previous) * 100;
  const percent = Math.round(Math.abs(raw));
  if (raw > 0) return { direction: "up", percent };
  if (raw < 0) return { direction: "down", percent };
  return { direction: "flat", percent: 0 };
}
