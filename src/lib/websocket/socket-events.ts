const EVENT_INVALIDATION_MAP: Record<string, string[][]> = {
  order_created: [["orders", "list"], ["nav-counts"], ["analytics", "overview"]],
  "order.created": [["orders", "list"], ["nav-counts"], ["analytics", "overview"]],
  order_updated: [["orders", "list"], ["nav-counts"], ["analytics", "overview"], ["inventory-status"], ["inventory", "list"]],
  "order.updated": [["orders", "list"], ["nav-counts"], ["analytics", "overview"], ["inventory-status"], ["inventory", "list"]],
  product_updated: [["products", "list"], ["nav-counts"], ["inventory-status"]],
  "product.created": [["products", "list"], ["nav-counts"], ["inventory-status"]],
  "product.updated": [["products", "list"], ["nav-counts"], ["inventory-status"]],
  payment_success: [["orders", "list"], ["nav-counts"], ["analytics", "overview"]],
  order_deleted: [["orders", "list"], ["nav-counts"], ["analytics", "overview"]],
  product_deleted: [["products", "list"], ["nav-counts"], ["inventory-status"]],
};

export const SOCKET_EVENTS = {
  ORDER_CREATED: "order_created",
  ORDER_CREATED_NEW: "order.created",
  ORDER_UPDATED: "order_updated",
  ORDER_UPDATED_NEW: "order.updated",
  PRODUCT_UPDATED: "product_updated",
  PRODUCT_CREATED_NEW: "product.created",
  PRODUCT_UPDATED_NEW: "product.updated",
  ORDER_DELETED: "order_deleted",
  PRODUCT_DELETED: "product_deleted",
} as const;

export function getQueryKeysToInvalidate(eventName: string): string[][] {
  return EVENT_INVALIDATION_MAP[eventName] ?? [];
}
