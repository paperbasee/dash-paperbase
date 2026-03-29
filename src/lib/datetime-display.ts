import { format, isValid } from "date-fns";
import { toLocaleDigits } from "@/lib/locale-digits";

function parseToDate(value: string): Date | null {
  const d = new Date(value);
  if (!isValid(d) || Number.isNaN(d.getTime())) return null;
  return d;
}

function withLocaleDigits(s: string, locale: string): string {
  return locale === "bn" ? toLocaleDigits(s, locale) : s;
}

/** `dd-MM-yyyy` (hyphen separators). */
export function formatDashboardDate(iso: string, locale: string): string {
  const d = parseToDate(iso);
  if (!d) return "—";
  return withLocaleDigits(format(d, "dd-MM-yyyy"), locale);
}

/** `dd-MM-yyyy HH:mm` */
export function formatDashboardDateTime(iso: string, locale: string): string {
  const d = parseToDate(iso);
  if (!d) return "—";
  return withLocaleDigits(format(d, "dd-MM-yyyy HH:mm"), locale);
}

/** `dd-MM-yyyy HH:mm:ss` */
export function formatDashboardDateTimeWithSeconds(iso: string, locale: string): string {
  const d = parseToDate(iso);
  if (!d) return "—";
  return withLocaleDigits(format(d, "dd-MM-yyyy HH:mm:ss"), locale);
}

/** Date only; empty string when missing or invalid (e.g. schedule rows). */
export function formatDashboardDateOptional(
  iso: string | null | undefined,
  locale: string
): string {
  if (iso == null || iso === "") return "";
  const d = parseToDate(iso);
  if (!d) return "";
  return withLocaleDigits(format(d, "dd-MM-yyyy"), locale);
}
