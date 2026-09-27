/**
 * The notes the analytics page works out itself from a report -- only what
 * the numbers actually show.
 */
import type { ChartPoint, DistrictsReport, SalesPoint, Series } from "./types";

/** Share of a whole, 0-100, for a bar. */
export function shareOf(part: number, whole: number): number {
  return whole > 0 ? (100 * part) / whole : 0;
}

/** The two hours in a row with the most orders, as [first hour, orders]. */
export function busiestHours(hours: number[]): [number, number] | null {
  let best: [number, number] | null = null;
  for (let hour = 0; hour < 24; hour++) {
    const orders = hours[hour] + hours[(hour + 1) % 24];
    if (orders > 0 && (!best || orders > best[1])) best = [hour, orders];
  }
  return best;
}

/** A district needs this many finished parcels before its return rate says anything. */
const RETURNS_FROM = 3;

/** What the numbers say, in a line or two -- only what they actually show. */
export function worthKnowing(report: DistrictsReport): { topShare: number; top: string[]; returns: { key: string; rate: number }[] } | null {
  const total = report.districts.reduce((sum, row) => sum + Number(row.sales), 0) + Number(report.not_recognised.sales);
  if (!total || report.districts.length < 3) return null;
  const top = report.districts.slice(0, 3);
  const topShare = shareOf(top.reduce((sum, row) => sum + Number(row.sales), 0), total);
  const returns = report.districts
    .filter((row) => row.parcels_finished >= RETURNS_FROM && row.returned_rate > 0)
    .sort((a, b) => b.returned_rate - a.returned_rate)
    .slice(0, 2)
    .map((row) => ({ key: row.key, rate: row.returned_rate }));
  return { topShare, top: top.map((row) => row.key), returns };
}

/** How far a number moved: a percentage of the one before, or -- a rate -- its points. */
export function changeOf(current: number, previous: number | null, unit: "percent" | "points"): number | null {
  if (previous === null) return null;
  if (unit === "points") return Math.round((current - previous) * 10) / 10;
  return previous ? Math.round(((current - previous) / previous) * 1000) / 10 : null;
}

/** A series as chart points, each beside the compared day (or hour) in the same place. */
export function pairUp<P extends { date: string }>(series: Series<P>, value: (point: P) => number): ChartPoint[] {
  return series.data.map((point, index) => ({
    date: point.date,
    current: value(point),
    previous: series.comparison[index] ? value(series.comparison[index]) : null,
    previousDate: series.comparison[index]?.date ?? null,
  }));
}

/** The numbers the Overview's chart can show. */
export type Metric = "sales" | "orders" | "visitors" | "conversion";

/** Confirmed orders for every hundred visitors, as the Conversion card counts them. */
function conversion(point: SalesPoint): number {
  return point.visitors ? Math.round((1000 * point.orders) / point.visitors) / 10 : 0;
}

const METRIC_VALUE: Record<Metric, (point: SalesPoint) => number> = {
  sales: (point) => Number(point.sales),
  orders: (point) => point.orders,
  visitors: (point) => point.visitors ?? 0,
  conversion,
};

export function metricPoints(series: Series<SalesPoint>, metric: Metric): ChartPoint[] {
  return pairUp(series, METRIC_VALUE[metric]);
}
