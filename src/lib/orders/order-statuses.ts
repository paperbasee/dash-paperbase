export const ORDER_STATUS_OPTIONS = ["pending", "confirmed", "cancelled"] as const;

export type OrderStatusValue = (typeof ORDER_STATUS_OPTIONS)[number];

export function formatOrderStatusLabel(status: string): string {
  if (!status) return "—";
  return status.replace(/_/g, " ");
}
