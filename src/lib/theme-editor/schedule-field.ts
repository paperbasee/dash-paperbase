import { bdWallToUtcIso } from "@/utils/time";

/*
 * A theme `datetime` setting, split into the two controls a merchant fills.
 *
 * The stored value is one ISO instant in UTC -- `2026-09-25T18:00:00Z` -- because the
 * storefront compares it against the clock and a shop page is cached, so the comparison
 * has to be exact (see shop-paperbase/storefront/schedule.py).
 *
 * The merchant types **Bangladesh wall clock**, the way every other date in this product
 * is typed. That is not a style choice: `<input type="datetime-local">` is read in the
 * BROWSER's timezone, so a merchant on a laptop still set to another zone would schedule
 * an Eid sale for the wrong hour and nothing on the screen would say so.
 *
 * The conversion itself is `@/utils/time`'s, unchanged, so this agrees with the coupons
 * and CTA forms rather than being a second opinion about what six o'clock means.
 */

/** A UTC instant as the date and time boxes show it in Dhaka; empty strings for no value. */
export function toBdParts(iso: unknown): { date: string; time: string } {
  if (typeof iso !== "string" || !iso.trim()) return { date: "", time: "" };
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return { date: "", time: "" };
  // `en-CA` renders as YYYY-MM-DD, which is what <input type="date"> holds, and
  // `en-GB` gives a 24-hour HH:mm for <input type="time">.
  const date = at.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
  const time = at.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { date, time };
}

/**
 * The two boxes back into one UTC instant, or "" for no bound.
 *
 * A date with no time means midnight — the start of that day, which is what a merchant
 * picking only a date means. A time with no date is not a moment at all, so it stores
 * nothing until they pick the day.
 */
export function toUtcIso(date: string, time: string): string {
  const day = date.trim();
  if (!day) return "";
  const [yyyy, mm, dd] = day.split("-");
  if (!yyyy || !mm || !dd) return "";
  const clock = /^\d{2}:\d{2}$/.test(time.trim()) ? time.trim() : "00:00";
  const iso = bdWallToUtcIso(`${dd}-${mm}-${yyyy} ${clock}`);
  if (!iso) return "";
  // Seconds, no milliseconds: the exact shape the API normalises to, so a value
  // that goes out and comes back is the same characters.
  return iso.replace(/\.\d{3}Z$/, "Z");
}
