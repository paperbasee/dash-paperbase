import api from "@/lib/api";

/**
 * The setup guide: what a new shop still needs before it can take a real order. Every step is
 * read from the shop by the API (`engine/apps/stores/setup.py`), never ticked here.
 */

export const SETUP_GUIDE_STEPS = [
  "shop",
  "product",
  "delivery",
  "courier",
  // Added by setup's "Where do you sell now?" (stores.setup.CHANNEL_STEPS), one for each place.
  "facebook_pixel",
  "instagram",
  "tiktok_pixel",
  "address",
] as const;

export type SetupGuideStepKey = (typeof SETUP_GUIDE_STEPS)[number];

export type SetupGuide = {
  steps: { key: SetupGuideStepKey; done: boolean }[];
  /** False once every step is done, or the owner put it away. */
  show: boolean;
};

/** Where each step is done. The shop itself is done by the time the guide exists. */
export const SETUP_GUIDE_HREF: Record<Exclude<SetupGuideStepKey, "shop">, string> = {
  product: "/products/new",
  delivery: "/shipping",
  courier: "/settings?tab=integrations",
  facebook_pixel: "/settings?tab=integrations",
  instagram: "/settings?tab=store",
  tiktok_pixel: "/settings?tab=integrations",
  address: "/settings?tab=store",
};

export async function fetchSetupGuide(): Promise<SetupGuide> {
  const { data } = await api.get<SetupGuide>("store/setup-guide/");
  return data;
}

export async function hideSetupGuide(): Promise<SetupGuide> {
  const { data } = await api.post<SetupGuide>("store/setup-guide/hide/");
  return data;
}
