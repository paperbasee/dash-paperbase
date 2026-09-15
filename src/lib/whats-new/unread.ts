/**
 * Unread tracking for the What's new panel.
 *
 * We remember, per signed-in user and per browser, the id of the newest entry that user has
 * seen. Everything above that id in the (newest-first) list is unread. Storage can be missing
 * or throw (private mode, blocked site data): every access is guarded, and "blocked" means
 * no dot and no New markers rather than a dot that can never be cleared.
 */

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

/** Result of reading the stored id: `blocked` when storage (or the user id) is unavailable. */
export type LastSeen = { kind: "blocked" } | { kind: "ok"; id: string | null };

export interface UnreadState {
  /** Whether to show the unread dot. */
  hasUnread: boolean;
  /** Entries newer than the stored id, to mark "New" in the panel. */
  newIds: ReadonlySet<string>;
}

const STORAGE_PREFIX = "paperbase:whats-new:last-seen:";

/** Same-tab broadcast so every mounted reader (desktop sidebar, mobile sheet) updates at once. */
export const WHATS_NEW_SEEN_EVENT = "paperbase:whats-new-seen";

export function whatsNewStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function readLastSeen(
  getStorage: () => StorageLike | null | undefined,
  userId: string | null | undefined,
): LastSeen {
  if (!userId) return { kind: "blocked" };
  try {
    const storage = getStorage();
    if (!storage) return { kind: "blocked" };
    const id = storage.getItem(whatsNewStorageKey(userId));
    return { kind: "ok", id: id || null };
  } catch {
    return { kind: "blocked" };
  }
}

/** Returns false (never throws) when the id could not be stored. */
export function writeLastSeen(
  getStorage: () => StorageLike | null | undefined,
  userId: string | null | undefined,
  id: string,
): boolean {
  if (!userId) return false;
  try {
    const storage = getStorage();
    if (!storage) return false;
    storage.setItem(whatsNewStorageKey(userId), id);
    return true;
  } catch {
    return false;
  }
}

const NOTHING_NEW: UnreadState = { hasUnread: false, newIds: new Set() };

/**
 * `entries` must be newest first. A stored id that is not in the list (pruned past the
 * 30-entry cap, or garbage) means the user last looked before every current entry.
 */
export function computeUnread(
  entries: readonly { id: string }[],
  lastSeen: LastSeen,
): UnreadState {
  if (lastSeen.kind === "blocked" || entries.length === 0) return NOTHING_NEW;
  if (lastSeen.id === entries[0].id) return NOTHING_NEW;

  const seenIndex = lastSeen.id === null ? -1 : entries.findIndex((e) => e.id === lastSeen.id);
  const unread = seenIndex === -1 ? entries : entries.slice(0, seenIndex);
  return { hasUnread: true, newIds: new Set(unread.map((e) => e.id)) };
}

/**
 * Formats a `YYYY-MM-DD` release date in the dashboard locale ("15 September 2026",
 * "১৫ সেপ্টেম্বর, ২০২৬"). Read as a calendar date in UTC so no time zone can move the day.
 */
export function formatWhatsNewDate(date: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const [, y, m, d] = match;
  try {
    return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))));
  } catch {
    return date;
  }
}
