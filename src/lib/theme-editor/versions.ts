import { formatDashboardTime } from "@/lib/datetime-display";
import { toLocaleDigits } from "@/lib/locale-digits";

/*
 * How one saved version is written in a history row: "Version 12 · 14 Sep, 3:40 PM · Rahim · Live".
 *
 * The number and the date are read as often as the name, so both are in the reader's own digits,
 * and the month is in their own language. The time is the dashboard's own (Asia/Dhaka, the shop's
 * day), so a version saved at ten in the evening does not read as the next morning.
 */

const DHAKA = { timeZone: "Asia/Dhaka" } as const;

const tag = (locale: string) => (locale === "bn" ? "bn-BD" : "en-US");

/** A version number in the reader's digits: "12", or "১২" in Bangla. */
export function versionNumber(revision: number, locale: string): string {
  return toLocaleDigits(String(revision), locale);
}

/**
 * When a version was saved: "14 Sep, 3:40 PM", or "১৪ সেপ, ৩:৪০ PM".
 *
 * Day before month in both languages, because that is how the rest of the dashboard writes a
 * date. An unreadable date gives the dashboard's own dash, never a wrong day.
 */
export function versionMoment(iso: string, locale: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "—";
  const day = at.toLocaleDateString(tag(locale), { ...DHAKA, day: "numeric" });
  const month = at.toLocaleDateString(tag(locale), { ...DHAKA, month: "short" });
  return `${day} ${month}, ${formatDashboardTime(iso, locale)}`;
}
