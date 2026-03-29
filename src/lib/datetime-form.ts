import { format, isValid, parse, parseISO } from "date-fns";

const DISPLAY_DATETIME = "dd-MM-yyyy HH:mm";
const API_LOCAL_DATETIME = "yyyy-MM-dd'T'HH:mm";

/** Load API / ISO datetime into form field text (local wall clock). */
export function isoDatetimeToDisplayInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const trimmed = iso.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = parse(trimmed, "yyyy-MM-dd", new Date());
    if (!isValid(d)) return "";
    return `${format(d, "dd-MM-yyyy")} 00:00`;
  }
  const d = parseISO(iso);
  if (!isValid(d)) return "";
  return format(d, DISPLAY_DATETIME);
}

/**
 * Parse form text into `YYYY-MM-DDTHH:mm` for API payloads (same shape as before `datetime-local`).
 * Returns `null` if empty; `null` if non-empty but invalid.
 */
export function displayInputToApiLocal(display: string): string | null {
  const t = display.trim();
  if (!t) return null;
  const d = parse(t, DISPLAY_DATETIME, new Date());
  if (!isValid(d)) return null;
  return format(d, API_LOCAL_DATETIME);
}
