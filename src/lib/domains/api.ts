import api from "@/lib/api";

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

/** True while a domain is still being connected, so the UI keeps polling. */
export function domainIsSettling(domain: StoreDomain): boolean {
  if (domain.status === "pending" || domain.status === "verifying") return true;
  // DNS is done but the certificate has not arrived, so the site does not load
  // over https yet. Keep polling: this is the window where a merchant is most
  // likely to be staring at the screen wondering whether it worked.
  return (
    domain.status === "active" &&
    domain.kind === "custom" &&
    (domain.ssl_status === "pending" || domain.ssl_status === "none")
  );
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
