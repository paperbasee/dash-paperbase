/**
 * Bangladesh wall time (Asia/Dhaka) using Intl only — no manual offsets.
 */

const BD = "Asia/Dhaka";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidYmd(s) {
  return typeof s === "string" && YMD_RE.test(s.trim());
}

/**
 * @param {string | number | Date} input
 * @param {{ withLabel?: boolean, withSeconds?: boolean, dateOnly?: boolean }} [options]
 * @returns {string}
 */
export function formatBDTime(input, options = {}) {
  const { withLabel = false, withSeconds = false, dateOnly = false } = options;
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";

  /** @type {Intl.DateTimeFormatOptions} */
  const opt = {
    timeZone: BD,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: true,
  };
  if (!dateOnly) {
    opt.hour = "numeric";
    opt.minute = "2-digit";
    if (withSeconds) opt.second = "2-digit";
  }

  // en-US yields reliable 12-hour + AM/PM in formatToParts (dayPeriod).
  const parts = new Intl.DateTimeFormat("en-US", opt).formatToParts(d);
  const p = Object.fromEntries(
    parts.filter((x) => x.type !== "literal").map((x) => [x.type, x.value])
  );
  const line = dateOnly
    ? `${p.day}-${p.month}-${p.year}`
    : withSeconds
      ? `${p.day}-${p.month}-${p.year} ${p.hour}:${p.minute}:${p.second} ${p.dayPeriod}`
      : `${p.day}-${p.month}-${p.year} ${p.hour}:${p.minute} ${p.dayPeriod}`;

  if (withLabel && !dateOnly) {
    return `${line} (GMT+6)`;
  }
  return line;
}

/**
 * Today's calendar date in Asia/Dhaka as `YYYY-MM-DD`.
 * @param {Date} [anchor]
 */
export function todayYmdInBD(anchor = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BD,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(anchor);
}

/**
 * Add calendar days to a `YYYY-MM-DD` string (Gregorian; no DST in Bangladesh).
 * @param {string} ymd
 * @param {number} delta
 */
export function addCalendarDaysYmd(ymd, delta) {
  const [y, m, d] = ymd.split("-").map(Number);
  const u = new Date(Date.UTC(y, m - 1, d + delta));
  const yy = u.getUTCFullYear();
  const mm = String(u.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(u.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * First day of the month (Asia/Dhaka) containing `anchor`, as `YYYY-MM-DD`.
 * @param {Date} [anchor]
 */
export function startOfMonthYmdInBD(anchor = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BD,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(anchor);
  const y = parts.find((x) => x.type === "year")?.value;
  const m = parts.find((x) => x.type === "month")?.value;
  return `${y}-${m}-01`;
}

/**
 * Parse `DD-MM-YYYY HH:mm` as Asia/Dhaka wall time and return UTC ISO string.
 * Uses explicit `+06:00` (Bangladesh has no DST).
 * @param {string} display
 * @returns {string | null}
 */
export function bdWallToUtcIso(display) {
  const m = String(display)
    .trim()
    .match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, min] = m;
  const isoLocal = `${yyyy}-${mm}-${dd}T${hh}:${min}:00+06:00`;
  const d = new Date(isoLocal);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * UTC instant as `YYYY-MM-DDTHH:mm` (naive UTC components, matches prior API shape).
 * @param {string} utcIso
 * @returns {string | null}
 */
export function utcIsoToApiNaiveUtc(utcIso) {
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

/**
 * API `YYYY-MM-DD` → display `DD-MM-YYYY 00:00` (calendar date, no zone shift).
 * @param {string} ymd
 */
export function ymdToDdMmYMidnight(ymd) {
  const m = String(ymd).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return `${m[3]}-${m[2]}-${m[1]} 00:00`;
}

export { isValidYmd };
