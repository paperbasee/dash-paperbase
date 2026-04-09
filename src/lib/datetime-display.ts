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
