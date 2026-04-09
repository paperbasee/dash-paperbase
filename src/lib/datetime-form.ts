import { bdWallToUtcIso, formatBDTime, utcIsoToApiNaiveUtc, ymdToDdMmYMidnight } from "@/utils/time";

/** Load API / ISO datetime into form field text (Bangladesh wall clock). */
export function isoDatetimeToDisplayInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const trimmed = iso.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return ymdToDdMmYMidnight(trimmed);
  }
  const s = formatBDTime(trimmed);
  return s === "—" ? "" : s;
}

/**
 * Parse form text into `YYYY-MM-DDTHH:mm` for API payloads (UTC components).
 * Returns `null` if empty; `null` if non-empty but invalid.
 */
export function displayInputToApiLocal(display: string): string | null {
  const t = display.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return `${t}T00:00`;
  }
  const utcIso = bdWallToUtcIso(t);
  if (!utcIso) return null;
  return utcIsoToApiNaiveUtc(utcIso);
}
