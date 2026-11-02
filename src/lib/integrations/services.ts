/**
 * The services on Settings > Integrations, and the rules of the service switch
 * (owner, 2026-09-25): one card per SERVICE -- Meta, TikTok, Steadfast -- with
 * every connection of that service listed in its pop-up, each with its own switch.
 *
 * The pop-up's top switch is the whole service at once. It reads "on" while any
 * connection is on; turning it off turns every connection off (after a warning),
 * and turning it back on turns every one back on. There is no separate
 * service-wide flag stored anywhere: two layers of switches would let a pixel be
 * "on" inside a service that is "off", and nobody could tell whether it sends.
 *
 * A DISCONNECTED connection (its credentials forgotten, its settings kept) is
 * outside all of that: no switch reaches it, because only reconnecting --
 * new credentials -- can turn it on again. The API refuses anything else.
 *
 * Services that do not work yet are shown as "Coming soon", with no button.
 */

/** A shop may connect at most this many pixels per ad service (the API's limit too). */
export const MAX_PIXELS_PER_SERVICE = 3;

export type PixelService = "facebook" | "tiktok";
export type ServiceKey =
  | PixelService
  | "google_analytics"
  | "steadfast"
  | "pathao"
  | "carrybee"
  | "redx"
  | "paperfly"
  | "parceldex";

export const AD_SERVICES: readonly PixelService[] = ["facebook", "tiktok"];
export const AD_SERVICES_COMING_SOON: readonly ServiceKey[] = ["google_analytics"];
export const DELIVERY_SERVICES_COMING_SOON: readonly ServiceKey[] = [
  "pathao",
  "carrybee",
  "redx",
  "paperfly",
  "parceldex",
];

/** Every service's logo, served from `public/`. The courier ones are wordmarks (about 3:1), so their tile is wide. */
export const SERVICE_LOGO_FILES: Record<ServiceKey, { src: string; wide: boolean }> = {
  facebook: { src: "/assets/integration-logos/meta.svg", wide: false },
  tiktok: { src: "/assets/integration-logos/tiktok.svg", wide: false },
  google_analytics: { src: "/assets/integration-logos/google-analytics.svg", wide: false },
  steadfast: { src: "/assets/courier-assets/steadfast-logo.png", wide: true },
  pathao: { src: "/assets/courier-assets/pathao-logo.png", wide: true },
  carrybee: { src: "/assets/courier-assets/carrybee-logo.webp", wide: true },
  redx: { src: "/assets/courier-assets/redx-logo.png", wide: true },
  paperfly: { src: "/assets/courier-assets/paperfly-logo.png", wide: true },
  parceldex: { src: "/assets/courier-assets/parceldex-logo.png", wide: true },
};

export type Switchable = { public_id: string; is_active: boolean; is_connected: boolean };

export type ServiceState = {
  /** Every connection, disconnected ones included (they count toward the limit). */
  count: number;
  /** Those that still hold their credentials: what the switches act on. */
  connected: number;
  disconnected: number;
  active: number;
  /** What the service switch shows: on while any connection is on. */
  on: boolean;
  shape: "none" | "disconnected" | "all_on" | "all_off" | "some_on";
};

export function serviceState(connections: readonly Switchable[]): ServiceState {
  const count = connections.length;
  const connected = connections.filter((one) => one.is_connected);
  const active = connected.filter((one) => one.is_active).length;
  const shape =
    count === 0
      ? "none"
      : connected.length === 0
        ? "disconnected"
        : active === connected.length
          ? "all_on"
          : active === 0
            ? "all_off"
            : "some_on";
  return {
    count,
    connected: connected.length,
    disconnected: count - connected.length,
    active,
    on: active > 0,
    shape,
  };
}

/** The connections the service switch has to change to reach `turnOn`: connected ones only. */
export function switchTargets<T extends Switchable>(connections: readonly T[], turnOn: boolean): T[] {
  return connections.filter((one) => one.is_connected && one.is_active !== turnOn);
}

/** Room for another pixel; a disconnected one still takes its place. */
export function pixelsLeft(connections: readonly unknown[]): number {
  return Math.max(0, MAX_PIXELS_PER_SERVICE - connections.length);
}

type PatchHttp = { patch<T>(path: string, body: unknown): Promise<{ data: T }> };

/**
 * Turn every connection of a service on or off, one request each. Every one is
 * tried even when one fails, so a single refusal never leaves the rest
 * half-way; the ids that failed come back for the caller to report.
 */
export async function setServiceActive<T extends Switchable>(
  http: PatchHttp,
  pathFor: (publicId: string) => string,
  connections: readonly T[],
  turnOn: boolean,
): Promise<{ failed: string[]; errors: unknown[] }> {
  const targets = switchTargets(connections, turnOn);
  const results = await Promise.allSettled(
    targets.map((one) => http.patch(pathFor(one.public_id), { is_active: turnOn })),
  );
  const failed: string[] = [];
  const errors: unknown[] = [];
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      failed.push(targets[index].public_id);
      errors.push(result.reason);
    }
  });
  return { failed, errors };
}

export type ServiceGroup = "ads" | "delivery";
/** The page's Overview filter. Every service is in exactly one, so the counts add up to the page. */
export type ServiceStanding = "connected" | "not_connected" | "coming_soon";
export type ServiceEntry = { key: ServiceKey; group: ServiceGroup; standing: ServiceStanding };

export const SERVICE_STANDINGS: readonly ServiceStanding[] = ["connected", "not_connected", "coming_soon"];

/**
 * The page's services in the order the cards are drawn: what works first, then what is coming.
 * Each side shows only to whoever may see it (`ads`, `delivery`); a service with no state yet is
 * not connected.
 */
export function listServices(
  can: { ads: boolean; delivery: boolean },
  states: Partial<Record<ServiceKey, ServiceState>>,
): ServiceEntry[] {
  const working = (key: ServiceKey, group: ServiceGroup): ServiceEntry => ({
    key,
    group,
    standing: states[key]?.count ? "connected" : "not_connected",
  });
  const coming = (key: ServiceKey, group: ServiceGroup): ServiceEntry => ({ key, group, standing: "coming_soon" });
  return [
    ...(can.ads ? AD_SERVICES.map((key) => working(key, "ads")) : []),
    ...(can.delivery ? [working("steadfast", "delivery")] : []),
    ...(can.ads ? AD_SERVICES_COMING_SOON.map((key) => coming(key, "ads")) : []),
    ...(can.delivery ? DELIVERY_SERVICES_COMING_SOON.map((key) => coming(key, "delivery")) : []),
  ];
}

/** No group ticked means all of them. */
export function inGroups(entries: readonly ServiceEntry[], groups: readonly ServiceGroup[]): ServiceEntry[] {
  return groups.length ? entries.filter((entry) => groups.includes(entry.group)) : [...entries];
}

export function countByStanding(entries: readonly ServiceEntry[]): Record<ServiceStanding, number> {
  const counts: Record<ServiceStanding, number> = { connected: 0, not_connected: 0, coming_soon: 0 };
  for (const entry of entries) counts[entry.standing] += 1;
  return counts;
}

/**
 * The cards left showing. A standing that has nothing left in it stops filtering, so connecting
 * the last unconnected service never leaves an empty page behind.
 */
export function shownServices(
  entries: readonly ServiceEntry[],
  groups: readonly ServiceGroup[],
  standing: ServiceStanding | null,
): ServiceEntry[] {
  const grouped = inGroups(entries, groups);
  const left = standing ? grouped.filter((entry) => entry.standing === standing) : grouped;
  return left.length ? left : grouped;
}

export const marketingIntegrationPath = (publicId: string) =>
  `admin/marketing-integrations/${publicId}/`;
export const courierPath = (publicId: string) => `admin/couriers/${publicId}/`;
/** POST: forget the credentials, keep the connection (Remove is DELETE on the path above). */
export const disconnectPath = (path: string) => `${path}disconnect/`;
