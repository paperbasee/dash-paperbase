import api from "@/lib/api";
import type { Order, SupportTicket, PaginatedResponse } from "@/types";

export type NotificationType = "new_order" | "support_ticket";

export interface DashboardNotification {
  /** Unique identifier for this specific notification row */
  id: string;
  /** Underlying resource ID (e.g. order ID) as string */
  resourceId: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

export function getNotificationLink(notification: DashboardNotification): string {
  switch (notification.type) {
    case "new_order":
      return `/orders/${notification.resourceId}`;
    case "support_ticket":
      return "/support-tickets";
    default:
      return "/";
  }
}

export async function fetchNotifications(): Promise<DashboardNotification[]> {
  let ordersRes: { data: unknown };
  let supportTicketsRes: { data: unknown };

  try {
    [ordersRes, supportTicketsRes] = await Promise.all([
      api.get<PaginatedResponse<Order>>("admin/orders/"),
      api.get<PaginatedResponse<SupportTicket>>("admin/support-tickets/"),
    ]);
  } catch {
    // 401/403 when unauthenticated or non-staff; return empty array
    return [];
  }

  const notifications: DashboardNotification[] = [];

  const orders = Array.isArray((ordersRes.data as { results?: unknown }).results)
    ? (ordersRes.data as PaginatedResponse<Order>).results
    : (ordersRes.data as Order[]);
  for (const order of orders) {
    notifications.push({
      id: `order-${order.public_id}`,
      resourceId: order.public_id,
      type: "new_order",
      title: "New order placed",
      message: `Order #${order.order_number} from ${order.shipping_name}`,
      createdAt: order.created_at,
      isRead: false,
    });
  }

  const tickets = (supportTicketsRes.data as PaginatedResponse<SupportTicket>).results ?? [];
  for (const item of tickets) {
    notifications.push({
      id: `support-ticket-${item.public_id}`,
      resourceId: item.public_id,
      type: "support_ticket",
      title: "New support ticket",
      message: `${item.name} (${item.phone || item.email})`,
      createdAt: item.created_at,
      isRead: false,
    });
  }

  return notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function markAllAsReadOnClient(
  notifications: DashboardNotification[]
): DashboardNotification[] {
  return notifications.map((n) => ({ ...n, isRead: true }));
}
