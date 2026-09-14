import { orderEditorVariantsQueryKeyRoot } from "@/lib/query-keys";

/**
 * The order editors' variants carry available stock. Orders (storefront checkouts, other
 * sessions, status changes) and product saves move it, so those events reload it. The API sends
 * no inventory event, so a stock adjustment made in another session is not pushed here.
 */
const ORDER_EDITOR_VARIANTS: string[] = [...orderEditorVariantsQueryKeyRoot];

const EVENT_INVALIDATION_MAP: Record<string, string[][]> = {
  "order.created": [
    ["orders", "list"],
    ["nav-counts"],
    ["analytics", "overview"],
    ORDER_EDITOR_VARIANTS,
  ],
  "order.updated": [
    ["orders", "list"],
    ["nav-counts"],
    ["analytics", "overview"],
    ["inventory", "counts"],
    ["inventory", "list"],
    ORDER_EDITOR_VARIANTS,
  ],
  "order.deleted": [["orders", "list"], ["nav-counts"], ["analytics", "overview"]],
  "product.created": [["products", "list"], ["nav-counts"], ["inventory", "counts"]],
  "product.updated": [
    ["products", "list"],
    ["nav-counts"],
    ["inventory", "counts"],
    ORDER_EDITOR_VARIANTS,
  ],
  "product.deleted": [["products", "list"], ["nav-counts"], ["inventory", "counts"]],
  "payment.success": [["orders", "list"], ["nav-counts"], ["analytics", "overview"]],
};

export const SOCKET_EVENTS = {
  ORDER_CREATED: "order.created",
  ORDER_UPDATED: "order.updated",
  ORDER_DELETED: "order.deleted",
  PRODUCT_CREATED: "product.created",
  PRODUCT_UPDATED: "product.updated",
  PRODUCT_DELETED: "product.deleted",
  PAYMENT_SUCCESS: "payment.success",
} as const;

export function getQueryKeysToInvalidate(eventName: string): string[][] {
  return EVENT_INVALIDATION_MAP[eventName] ?? [];
}
