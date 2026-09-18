import { formatBDTime } from "@/utils/time";
import { toLocaleDigits } from "@/lib/locale-digits";

function withLocaleDigits(s: string, locale: string): string {
  return locale === "bn" ? toLocaleDigits(s, locale) : s;
}

/** `dd-MM-yyyy` (hyphen separators), calendar / instant in Asia/Dhaka. */
export function formatDashboardDate(iso: string, locale: string): string {
  const s = formatBDTime(iso, { dateOnly: true });
  if (s === "—") return "—";
  return withLocaleDigits(s, locale);
}

/** `dd-MM-yyyy HH:mm` in Asia/Dhaka. */
export function formatDashboardDateTime(iso: string, locale: string): string {
  const s = formatBDTime(iso);
  if (s === "—") return "—";
  return withLocaleDigits(s, locale);
}

/**
 * The part of the day a Bangla reader expects in front of a 12-hour time
 * ("বিকেল ৩:৪০"), by the hour in Asia/Dhaka.
 */
function banglaDayPart(hour24: number): string {
  if (hour24 < 4) return "রাত";
  if (hour24 < 12) return "সকাল";
  if (hour24 < 16) return "দুপুর";
  if (hour24 < 18) return "বিকেল";
  if (hour24 < 20) return "সন্ধ্যা";
  return "রাত";
}

/** Time only (`h:mm AM/PM`, or `সকাল h:mm` in Bangla) in Asia/Dhaka. */
export function formatDashboardTime(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const formatted = d.toLocaleTimeString(locale === "bn" ? "bn-BD" : "en-US", {
    timeZone: "Asia/Dhaka",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (locale !== "bn") return formatted;
  // CLDR bn gives the Latin "AM"/"PM", which is the one English word left on an otherwise
  // Bangla row. Bangla says the part of the day, and says it first.
  const hour24 = Number(
    d.toLocaleString("en-US", { timeZone: "Asia/Dhaka", hour: "2-digit", hourCycle: "h23" })
  );
  const time = withLocaleDigits(formatted.replace(/\s*[AaPp]\.?[Mm]\.?\s*/, ""), locale);
  return `${banglaDayPart(hour24)} ${time}`;
}

/** `dd-MM-yyyy HH:mm:ss` in Asia/Dhaka. */
export function formatDashboardDateTimeWithSeconds(iso: string, locale: string): string {
  const s = formatBDTime(iso, { withSeconds: true });
  if (s === "—") return "—";
  return withLocaleDigits(s, locale);
}

/** Date only; empty string when missing or invalid (e.g. schedule rows). */
export function formatDashboardDateOptional(
  iso: string | null | undefined,
  locale: string
): string {
  if (iso == null || iso === "") return "";
  const s = formatBDTime(iso, { dateOnly: true });
  if (s === "—") return "";
  return withLocaleDigits(s, locale);
}
