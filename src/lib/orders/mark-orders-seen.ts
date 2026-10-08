import { currentShop } from "@/lib/api";
import { buildApiUrl } from "@/lib/api-client";
import { heldPass } from "@/lib/accounts/pass";

/** Sent as the page goes, so with the pass held now: there is no waiting for a fresh one. */
function fireKeepalivePost(path: string, body: object = {}): void {
  if (typeof window === "undefined") return;
  const pass = heldPass();
  if (!pass) return;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${pass}`,
  };
  const shop = currentShop();
  if (shop) {
    headers["X-Store-Public-ID"] = shop;
  }
  void fetch(buildApiUrl(path), {
    method: "POST",
    keepalive: true,
    headers,
    body: JSON.stringify(body),
  }).catch(() => {
    // Silent failure — highlights may persist one extra visit.
  });
}

/** Mark a list of orders as seen (fire-and-forget). Called on page unmount. */
export function markOrdersSeen(orderIds: string[]): void {
  if (!orderIds.length) return;
  fireKeepalivePost("admin/orders/mark-seen/", { order_ids: orderIds });
}

/** Mark a single order as seen (fire-and-forget). Called on eye/row click. */
export function markOrderSeen(publicId: string): void {
  fireKeepalivePost(`admin/orders/${publicId}/mark-seen/`);
}
