/**
 * The notes the analytics page works out itself from a report -- only what
 * the numbers actually show.
 */
import type { DistrictsReport } from "./types";

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
