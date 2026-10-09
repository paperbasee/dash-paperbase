import api from "@/lib/api";
import { isApiHttpError } from "@/lib/api-client";

/**
 * Storefront domains: the hostnames a store answers on.
 *
 * Mirrors engine/apps/stores/domain_views.py. Field names stay in the API's
 * snake_case so a response can be used without a mapping layer.
 */

export const STORE_DOMAIN_STATUSES = [
  "pending",
  "verifying",
  "active",
  "failed",
  "disabled",
] as const;

export type StoreDomainStatus = (typeof STORE_DOMAIN_STATUSES)[number];

/** "subdomain" is the permanent Paperbase address; "custom" is the merchant's own. */
export type StoreDomainKind = "subdomain" | "custom";

export type StoreDomainSslStatus = "none" | "pending" | "issued" | "failed";

/**
 * What a shopper's browser met on https, checked from outside (engine/apps/stores/https_checks.py),
 * for custom domains only. ssl_status measures our own certificate; a merchant behind Cloudflare
 * can still serve shoppers an insecure or broken https (Flexible, Off, an edge certificate not yet
 * ready), so the shop is moved to https only once this reads "ok". "" means no answer yet: not
 * checked since the domain last went live (https_checked_at null: the API must clear it with every
 * reset of this field), or checked and the domain did not answer (https_checked_at set).
 */
export type StoreDomainHttpsCheck =
  | ""
  | "ok"
  | "origin_over_http"
  | "edge_redirects_to_http"
  | "edge_certificate_invalid"
  | "wrong_answer";

export interface StoreDomainDnsRecord {
  type: string;
  name: string;
  value: string;
  note: string;
}

export interface StoreDomain {
  public_id: string;
  hostname: string;
  kind: StoreDomainKind;
  status: StoreDomainStatus;
  is_primary: boolean;
  ssl_status: StoreDomainSslStatus;
  ssl_checked_at: string | null;
  ssl_expires_at: string | null;
  ssl_error: string;
  https_check: StoreDomainHttpsCheck;
  https_checked_at: string | null;
  verified_at: string | null;
  last_checked_at: string | null;
  check_error: string;
  created_at: string;
  /** Only custom domains can be removed; the Paperbase address is permanent. */
  removable: boolean;
  /** Present for custom domains; the records the merchant must create. */
  dns_records?: StoreDomainDnsRecord[];
}

export interface StoreDomainVerifyResponse {
  domain: StoreDomain;
  verified: boolean;
  ownership_ok: boolean;
  pointing_ok: boolean;
  message: string;
}

const BASE = "settings/network/domains/";

/** Tolerant of both a bare array and a DRF-style { results } envelope. */
function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { results?: T[] }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

export async function fetchDomains(): Promise<StoreDomain[]> {
  const { data } = await api.get(BASE);
  return unwrapList<StoreDomain>(data);
}

export async function connectDomain(hostname: string): Promise<StoreDomain> {
  const { data } = await api.post<StoreDomain>(BASE, { hostname });
  return data;
}

export async function verifyDomain(publicId: string): Promise<StoreDomainVerifyResponse> {
  const { data } = await api.post<StoreDomainVerifyResponse>(`${BASE}${publicId}/verify/`);
  return data;
}

export async function setPrimaryDomain(publicId: string): Promise<StoreDomain> {
  const { data } = await api.post<StoreDomain>(`${BASE}${publicId}/set-primary/`);
  return data;
}

export async function removeDomain(publicId: string): Promise<void> {
  await api.delete(`${BASE}${publicId}/`);
}

/** The API runs "Check again" at most once per domain in this many seconds (domain_views.py). */
const HTTPS_CHECK_WINDOW_SECONDS = 30;

/**
 * Why the API would not run "Check again" now, typed so the Domains tab can say it in the
 * merchant's language: the API's own `detail` is English.
 *
 * - "too_soon" (429): this domain was checked in the last 30 seconds; `retryAfter` is the
 *   seconds left.
 * - "not_live" (400, or 404 once it was removed): only a merchant's own live domain is checked,
 *   and this one is not (any more), so the page is showing an old state.
 */
export class HttpsCheckRefusedError extends Error {
  readonly reason: "too_soon" | "not_live";
  readonly retryAfter: number;

  constructor(reason: "too_soon" | "not_live", retryAfter = 0) {
    super(reason === "too_soon" ? "Checked a moment ago" : "Only a live custom domain can be checked");
    this.name = "HttpsCheckRefusedError";
    this.reason = reason;
    this.retryAfter = retryAfter;
  }
}

/** retry_after in whole seconds; a 429 without one waits out the whole window. */
function secondsToWait(data: unknown): number {
  const raw =
    data && typeof data === "object" ? (data as { retry_after?: unknown }).retry_after : undefined;
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0
    ? Math.ceil(raw)
    : HTTPS_CHECK_WINDOW_SECONDS;
}

/**
 * "Check again": probe the certificate and run the outside https check now, and answer the
 * domain as they left it. It never re-verifies DNS, so pressing it cannot demote a live domain
 * over a moment's lookup failure.
 */
export async function checkHttps(publicId: string): Promise<StoreDomain> {
  try {
    const { data } = await api.post<StoreDomain>(`${BASE}${publicId}/check-https/`);
    return data;
  } catch (error) {
    if (isApiHttpError(error) && error.status === 429) {
      throw new HttpsCheckRefusedError("too_soon", secondsToWait(error.data));
    }
    if (isApiHttpError(error) && (error.status === 400 || error.status === 404)) {
      throw new HttpsCheckRefusedError("not_live");
    }
    throw error;
  }
}

/**
 * What a shopper meets on this address right now, for the notice beside it.
 *
 * Only a merchant's own live domain has one. A free address sits on our DNS-only wildcard,
 * straight to our server, so the certificate we measure is the one shoppers see, and it keeps
 * the quiet it always had. For a custom domain the certificate comes first; once it is issued,
 * the outside check decides between "secure" and the one thing the merchant must change.
 */
export type DomainSecureState =
  | "secure"
  | "certificatePending"
  | "certificateFailed"
  | "checking"
  | "noAnswer"
  | "originOverHttp"
  | "edgeRedirectsToHttp"
  | "edgeCertificateInvalid"
  | "wrongAnswer";

export function domainSecureState(domain: StoreDomain): DomainSecureState | null {
  if (domain.kind !== "custom" || domain.status !== "active") return null;
  if (domain.ssl_status === "failed") return "certificateFailed";
  if (domain.ssl_status !== "issued") return "certificatePending";
  switch (domain.https_check) {
    case "ok":
      return "secure";
    case "origin_over_http":
      return "originOverHttp";
    case "edge_redirects_to_http":
      return "edgeRedirectsToHttp";
    case "edge_certificate_invalid":
      return "edgeCertificateInvalid";
    case "wrong_answer":
      return "wrongAnswer";
    default:
      // No answer yet. A check that ran and timed out stamps https_checked_at but keeps the
      // value it had, so "" with a time means it was tried and our check could not get through.
      return domain.https_checked_at ? "noAnswer" : "checking";
  }
}

/** True while a domain is still being connected, so the UI keeps polling. */
export function domainIsSettling(domain: StoreDomain): boolean {
  if (domain.status === "pending" || domain.status === "verifying") return true;
  // DNS is done but the certificate has not arrived, so the site does not load
  // over https yet; or it has, and the first outside check is moments away. Keep
  // polling: this is the window where a merchant is most likely to be staring at
  // the screen wondering whether it worked.
  const secure = domainSecureState(domain);
  return secure === "certificatePending" || secure === "checking";
}

/** How one press of "Check again" ended, for the Domains tab to say in words. */
export type HttpsCheckOutcome =
  | { kind: "secure" }
  | { kind: "notSecure" }
  | { kind: "noAnswer" }
  | { kind: "tooSoon"; seconds: number }
  | { kind: "notLive" }
  | { kind: "failed"; error: unknown };

/**
 * Run one "Check again" and say how it ended. A check that ran is never an error, whatever it
 * found -- the notice beside the domain then says what to change, or that the domain did not
 * answer us. Only a refusal, or no answer from Paperbase, is.
 */
export async function runHttpsCheck(check: () => Promise<StoreDomain>): Promise<HttpsCheckOutcome> {
  try {
    const state = domainSecureState(await check());
    if (state === "secure") return { kind: "secure" };
    return { kind: state === "noAnswer" ? "noAnswer" : "notSecure" };
  } catch (error) {
    if (error instanceof HttpsCheckRefusedError) {
      return error.reason === "too_soon"
        ? { kind: "tooSoon", seconds: error.retryAfter }
        : { kind: "notLive" };
    }
    return { kind: "failed", error };
  }
}

/**
 * The cached list with one domain replaced by the answer its check gave. That answer may leave
 * out the DNS records, which only a domain being set up shows, so the row keeps its own.
 */
export function withCheckedDomain(
  rows: StoreDomain[] | undefined,
  checked: StoreDomain,
): StoreDomain[] | undefined {
  return rows?.map((row) => (row.public_id === checked.public_id ? { ...row, ...checked } : row));
}

/** Mirrors the server's canonical URL rule: https everywhere but local suffixes. */
export function storefrontUrlFor(hostname: string): string {
  const isLocal =
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".test");
  return `${isLocal ? "http" : "https"}://${hostname}`;
}

/**
 * The address a shopper reaches this shop on: its canonical one, falling back to any live
 * address, so a shop that is serving is never treated as having none. Null while the list has
 * not arrived, or when this member may not read it.
 */
export function liveStorefrontDomain(domains: StoreDomain[] | undefined): StoreDomain | null {
  return (
    domains?.find((d) => d.is_primary && d.status === "active") ??
    domains?.find((d) => d.status === "active") ??
    null
  );
}
