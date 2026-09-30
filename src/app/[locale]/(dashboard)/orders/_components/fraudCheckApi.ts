import type { Order } from "@/types";

import type { FraudCheckApiOk } from "./types";

/** The part of the API client this needs (`@/lib/api`), so a test can stand in for it. */
type Client = {
  get: <T>(url: string) => Promise<{ data: T }>;
  post: <T>(url: string, body: unknown) => Promise<{ data: T }>;
};

/** The HTTP status of a failed request, when it got one. */
export function errorStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object" || !("response" in err)) return undefined;
  const resp = (err as Record<string, unknown>).response;
  if (!resp || typeof resp !== "object") return undefined;
  const status = (resp as Record<string, unknown>).status;
  return typeof status === "number" ? status : undefined;
}

/**
 * An order's fraud check (owner, 2026-09-30: "save to db so that when merchants click this will
 * immediately show the report"): the report the order keeps -- checked when it arrived, or since --
 * which costs nothing to open; a check when it has none, or on "Check again" (`fresh`), which asks
 * the provider anew and spends the plan, so only a member who may run checks (`canCheck`) does.
 */
export async function loadFraudCheck(
  client: Client,
  order: Pick<Order, "public_id" | "phone" | "fraud_report">,
  { fresh, canCheck }: { fresh: boolean; canCheck: boolean },
): Promise<FraudCheckApiOk> {
  if (!fresh && order.fraud_report) {
    try {
      const { data } = await client.get<FraudCheckApiOk>(`fraud-check/orders/${order.public_id}/`);
      return data;
    } catch (err: unknown) {
      // 404: no report after all (the list was read earlier); a member who may check runs one.
      if (errorStatus(err) !== 404 || !canCheck) throw err;
    }
  }
  const { data } = await client.post<FraudCheckApiOk>("fraud-check/", {
    phone: order.phone,
    // The order keeps the check and its report (its badge in the order list).
    order: order.public_id,
    ...(fresh ? { fresh: true } : {}),
  });
  return data;
}
