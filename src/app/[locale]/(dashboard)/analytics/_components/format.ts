import type { OverviewData, RangeOption } from "./types";

export function formatChartAxisLabel(iso: string, range: RangeOption): string {
  try {
    const d = new Date(iso);
    if (range === "today") {
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export function metricAllZero(o: OverviewData | null): boolean {
  if (!o) return false;
  const vals = [
    o.pageviews.value,
    o.sessions.value,
    o.revenue.value,
    o.orders.value,
    o.delivered.value,
    o.returned.value,
  ];
  return vals.every((n) => !n);
}
