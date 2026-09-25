/**
 * When a cash on delivery order counts as a sale for the shop's Meta and TikTok
 * ads -- the shop's own choice since 2026-09-25 (it was one switch for the whole
 * platform). One choice covers both platforms; prepaid orders ignore it and
 * count when the customer submits the payment.
 *
 * Read and changed at `admin/marketing-integrations/purchase-timing/`: anyone who
 * can see the integrations can read it, only someone who can manage them
 * (owner, admin) can change it.
 */

export const PURCHASE_TIMINGS = ["placement", "confirmation"] as const;

export type PurchaseTiming = (typeof PURCHASE_TIMINGS)[number];

export const PURCHASE_TIMING_PATH = "admin/marketing-integrations/purchase-timing/";

type Http = {
  get<T>(path: string): Promise<{ data: T }>;
  patch<T>(path: string, body: unknown): Promise<{ data: T }>;
};

type Answer = { cod_purchase_trigger: string };

/** Anything the API does not know reads as the default, never as confirmation. */
export function asPurchaseTiming(value: unknown): PurchaseTiming {
  return value === "confirmation" ? "confirmation" : "placement";
}

export async function fetchPurchaseTiming(http: Http): Promise<PurchaseTiming> {
  const { data } = await http.get<Answer>(PURCHASE_TIMING_PATH);
  return asPurchaseTiming(data?.cod_purchase_trigger);
}

export async function savePurchaseTiming(http: Http, timing: PurchaseTiming): Promise<PurchaseTiming> {
  const { data } = await http.patch<Answer>(PURCHASE_TIMING_PATH, { cod_purchase_trigger: timing });
  return asPurchaseTiming(data?.cod_purchase_trigger);
}
