/**
 * The dashboard's notice from Paperbase's status page (status.paperbase.me, `NEXT_PUBLIC_STATUS_URL`):
 * what its summary says a merchant should know while working (owner, 2026-10-01) -- an open
 * incident, maintenance going on now, or maintenance starting in the next 24 hours.
 *
 * One notice at a time, the most pressing: the worst open incident, then maintenance now, then the
 * soonest maintenance ahead. Each can be put away; it comes back only when something new happens
 * (another incident, or the maintenance that was coming has started).
 */

export interface StatusIncident {
  id: number;
  title_en: string;
  title_bn: string;
  impact: "degraded" | "partial_outage" | "major_outage";
  status: string;
  started_at: number;
}

export interface StatusMaintenance {
  id: number;
  title_en: string;
  title_bn: string;
  starts_at: number;
  ends_at: number;
}

export interface StatusSummary {
  incidents: StatusIncident[];
  maintenance: StatusMaintenance[];
}

export type StatusNotice =
  | ({ kind: "incident"; key: string; more: number } & StatusIncident)
  | ({ kind: "maintenance_now" | "maintenance_soon"; key: string; more: number } & StatusMaintenance);

/** Maintenance this close is worth a word in the dashboard. */
export const SOON_S = 24 * 60 * 60;

const IMPACTS = ["degraded", "partial_outage", "major_outage"] as const;

/** The status page's address, or "" when this dashboard has none (no notice at all). */
export function statusUrl(): string {
  return (process.env.NEXT_PUBLIC_STATUS_URL ?? "").trim().replace(/\/+$/, "");
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const text = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** The summary's JSON, read carefully: anything not as expected is left out, never thrown. */
export function parseSummary(raw: unknown): StatusSummary | null {
  if (!isRecord(raw) || !Array.isArray(raw.incidents) || !Array.isArray(raw.maintenance)) return null;
  const incidents: StatusIncident[] = [];
  for (const i of raw.incidents) {
    if (!isRecord(i)) continue;
    const id = num(i.id);
    const started_at = num(i.started_at);
    const impact = IMPACTS.find((x) => x === i.impact);
    if (id === null || started_at === null || !impact || !text(i.title_en)) continue;
    incidents.push({
      id,
      title_en: text(i.title_en),
      title_bn: text(i.title_bn),
      impact,
      status: text(i.status),
      started_at,
    });
  }
  const maintenance: StatusMaintenance[] = [];
  for (const m of raw.maintenance) {
    if (!isRecord(m)) continue;
    const id = num(m.id);
    const starts_at = num(m.starts_at);
    const ends_at = num(m.ends_at);
    if (id === null || starts_at === null || ends_at === null || !text(m.title_en)) continue;
    maintenance.push({ id, title_en: text(m.title_en), title_bn: text(m.title_bn), starts_at, ends_at });
  }
  return { incidents, maintenance };
}

/** The most pressing notice not put away, at `nowS` (unix seconds); null when there is none. */
export function pickNotice(
  summary: StatusSummary,
  nowS: number,
  dismissed: ReadonlySet<string>
): StatusNotice | null {
  const rank = (impact: StatusIncident["impact"]) => IMPACTS.indexOf(impact);
  const candidates: StatusNotice[] = [
    ...[...summary.incidents]
      .sort((a, b) => rank(b.impact) - rank(a.impact) || b.started_at - a.started_at)
      .map((i) => ({ ...i, kind: "incident" as const, key: `incident-${i.id}`, more: 0 })),
    ...summary.maintenance
      .filter((m) => m.starts_at <= nowS && nowS < m.ends_at)
      .map((m) => ({ ...m, kind: "maintenance_now" as const, key: `maintenance-${m.id}-now`, more: 0 })),
    ...summary.maintenance
      .filter((m) => m.starts_at > nowS && m.starts_at - nowS <= SOON_S)
      .sort((a, b) => a.starts_at - b.starts_at)
      .map((m) => ({ ...m, kind: "maintenance_soon" as const, key: `maintenance-${m.id}-soon`, more: 0 })),
  ].filter((n) => !dismissed.has(n.key));
  const [first, ...rest] = candidates;
  return first ? { ...first, more: rest.length } : null;
}

/**
 * What the waiting page (a part of Paperbase not answering) tells of the status page: the worst
 * open incident, or the maintenance going on now -- even one put away in the dashboard's bar, since
 * it is why the page is up. Null when it reports neither; maintenance still to come is no reason.
 */
export function noticeWhileAway(summary: StatusSummary, nowS: number): StatusNotice | null {
  const notice = pickNotice(summary, nowS, new Set());
  return notice && notice.kind !== "maintenance_soon" ? notice : null;
}

/** The calendar day of a moment (unix seconds) in Bangladesh: "2026-10-02". */
export function dhakaDay(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
}

/** The title in the merchant's language: Bangla falls back to the English when not written. */
export function noticeTitle(notice: { title_en: string; title_bn: string }, locale: string): string {
  return locale === "bn" && notice.title_bn.trim() ? notice.title_bn : notice.title_en;
}

const DISMISSED_KEY = "paperbase:status-notice-dismissed";
/** Enough to remember every notice of a long while; the oldest are forgotten first. */
const DISMISSED_KEEP = 50;

/** The notices this browser has put away. A browser that keeps nothing simply shows them again. */
export function readDismissed(): Set<string> {
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.filter((k): k is string => typeof k === "string") : []);
  } catch {
    return new Set();
  }
}

export function rememberDismissed(dismissed: ReadonlySet<string>): void {
  try {
    const kept = [...dismissed].slice(-DISMISSED_KEEP);
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(kept));
  } catch {
    // Storage refused (a private window, full): the notice is put away until the page reloads.
  }
}
