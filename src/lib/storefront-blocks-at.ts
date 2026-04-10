/**
 * Storefront public API blocks when the owner's subscription is EXPIRED (calendar),
 * i.e. after ACTIVE (through end_date) and the one-day GRACE. Server uses Asia/Dhaka
 * calendar dates; the deadline is BD midnight at the start of calendar day end_date + 2.
 */

export function resolveStorefrontBlocksAtIso(
  endDate: string | null | undefined,
  apiIso: string | null | undefined
): string | null {
  const trimmed = apiIso?.trim();
  if (trimmed) return trimmed;
  if (!endDate?.trim()) return null;
  const part = endDate.includes("T") ? (endDate.split("T")[0] ?? endDate) : endDate;
  const bits = part.split("-").map((x) => parseInt(x, 10));
  if (bits.length !== 3 || bits.some((n) => Number.isNaN(n))) return null;
  const [y, mo, d] = bits;
  const utc = new Date(Date.UTC(y, mo - 1, d + 2));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}T00:00:00+06:00`;
}

/** Remaining time as `HH:MM` (ceil to next minute while time remains; `00:00` when done). */
export function formatTimeLeftHm(msRemaining: number): string {
  if (msRemaining <= 0) return "00:00";
  const totalMin = Math.ceil(msRemaining / 60000);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
