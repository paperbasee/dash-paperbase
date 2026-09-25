/**
 * The services on Settings > Integrations, and the rules of the card switch
 * (owner, 2026-09-25): one card per SERVICE -- Meta, TikTok, Steadfast -- with
 * every connection of that service listed inside it, each with its own switch.
 *
 * The card's own switch is the whole service at once. It reads "on" while any
 * connection is on; turning it off turns every connection off (after a warning),
 * and turning it back on turns every one back on. There is no separate
 * service-wide flag stored anywhere: two layers of switches would let a pixel be
 * "on" inside a service that is "off", and nobody could tell whether it sends.
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

/**
 * Picture logos, served from `public/`. Meta and TikTok are drawn as icons
 * instead. The courier ones are wordmarks (about 3:1), so their tile is wide.
 */
export const SERVICE_LOGO_FILES: Partial<Record<ServiceKey, { src: string; wide: boolean }>> = {
  google_analytics: { src: "/assets/integration-logos/google-analytics.svg", wide: false },
  steadfast: { src: "/assets/courier-assets/steadfast-logo.png", wide: true },
  pathao: { src: "/assets/courier-assets/pathao-logo.png", wide: true },
  carrybee: { src: "/assets/courier-assets/carrybee-logo.webp", wide: true },
  redx: { src: "/assets/courier-assets/redx-logo.png", wide: true },
  paperfly: { src: "/assets/courier-assets/paperfly-logo.png", wide: true },
  parceldex: { src: "/assets/courier-assets/parceldex-logo.png", wide: true },
};

/** The Paperbase mark: the dashboard's own icon, so a white-label build shows its own. */
export const PLATFORM_MARK_SRC = "/favicon-128x128.png";

export type Switchable = { public_id: string; is_active: boolean };

export type ServiceState = {
  count: number;
  active: number;
  /** What the card switch shows: on while any connection is on. */
  on: boolean;
  shape: "none" | "all_on" | "all_off" | "some_on";
};

export function serviceState(connections: readonly Switchable[]): ServiceState {
  const count = connections.length;
  const active = connections.filter((one) => one.is_active).length;
  const shape =
    count === 0 ? "none" : active === count ? "all_on" : active === 0 ? "all_off" : "some_on";
  return { count, active, on: active > 0, shape };
}

/** The connections a card switch has to change to reach `turnOn`. */
export function switchTargets<T extends Switchable>(connections: readonly T[], turnOn: boolean): T[] {
  return connections.filter((one) => one.is_active !== turnOn);
}

/** Room for another pixel. */
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

export const marketingIntegrationPath = (publicId: string) =>
  `admin/marketing-integrations/${publicId}/`;
export const courierPath = (publicId: string) => `admin/couriers/${publicId}/`;
