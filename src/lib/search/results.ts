/**
 * The search box's list: the dashboard's own places and actions (./places.ts), then what the
 * server found (GET admin/search/, engine/core/search_services.py), as one list the arrow keys
 * walk through. And the few searches a person made last, kept in this browser only.
 */

/** What the server found of one kind. `status` is a review's: the Reviews tab it is under. */
export interface SearchItem {
  public_id: string;
  title: string;
  subtitle?: string;
  status?: string;
}

/** The kinds the server answers with, in the order they are shown. */
export const SERVER_KINDS = [
  "products",
  "orders",
  "customers",
  "categories",
  "brands",
  "coupons",
  "posts",
  "reviews",
  "tickets",
  "team",
] as const;

export type ServerKind = (typeof SERVER_KINDS)[number];

export type SearchResponse = Record<ServerKind, SearchItem[]>;

export const EMPTY_RESULTS: SearchResponse = Object.fromEntries(
  SERVER_KINDS.map((kind) => [kind, []]),
) as unknown as SearchResponse;

/** The response, with any kind the server left out (an older API) empty. */
export function normalizeResults(data: Partial<Record<string, unknown>> | null | undefined): SearchResponse {
  return Object.fromEntries(
    SERVER_KINDS.map((kind) => [kind, Array.isArray(data?.[kind]) ? (data?.[kind] as SearchItem[]) : []]),
  ) as unknown as SearchResponse;
}

/** Where a found thing opens. A list page opens the one found (`?open=`, `useOpenFromAddress`). */
export function hrefFor(kind: ServerKind, item: SearchItem): string {
  const id = encodeURIComponent(item.public_id);
  switch (kind) {
    case "products":
      return `/products/${id}`;
    case "orders":
      return `/orders/${id}`;
    case "customers":
      return `/customers/${id}`;
    case "tickets":
      return `/support-tickets/${id}`;
    case "posts":
      return `/blog/${id}`;
    case "categories":
      return `/categories?open=${id}`;
    case "brands":
      return `/brands?open=${id}`;
    case "coupons":
      return `/coupons?open=${id}`;
    case "reviews":
      return `/reviews?tab=${encodeURIComponent(item.status || "pending")}&open=${id}`;
    case "team":
      return "/settings?tab=team";
  }
}

/** One line of the list. `group` names the heading it sits under. */
export interface SearchRow {
  key: string;
  group: string;
  href: string;
  title: string;
  subtitle?: string;
  /** Another site's page (places.ts `external`), opened as a link is. */
  external?: boolean;
}

// --- recent searches -----------------------------------------------------------------------------
// A convenience for one person on one browser, per shop: never needed, so any storage that is
// missing or refuses (a private window, blocked site data) just means no list.

const RECENT_MAX = 6;

function recentKey(storePublicId: string | null): string {
  return `paperbase.search.recent.${storePublicId || "none"}`;
}

export function readRecentSearches(storePublicId: string | null): string[] {
  try {
    const raw = window.localStorage.getItem(recentKey(storePublicId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((q): q is string => typeof q === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

/** Newest first, each once, at most six; one letter is not worth keeping. */
export function rememberSearch(storePublicId: string | null, query: string): string[] {
  const wanted = query.trim();
  const next = wanted.length < 2
    ? readRecentSearches(storePublicId)
    : [wanted, ...readRecentSearches(storePublicId).filter((q) => q.toLocaleLowerCase() !== wanted.toLocaleLowerCase())].slice(
        0,
        RECENT_MAX,
      );
  try {
    window.localStorage.setItem(recentKey(storePublicId), JSON.stringify(next));
  } catch {
    /* storage refused: the list just is not kept */
  }
  return next;
}

export function clearRecentSearches(storePublicId: string | null): void {
  try {
    window.localStorage.removeItem(recentKey(storePublicId));
  } catch {
    /* storage refused: nothing was kept */
  }
}
