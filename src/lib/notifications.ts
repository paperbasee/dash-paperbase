import api from "@/lib/api";

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

interface NotificationsSummaryOrder {
  public_id: string;
  order_number: string;
  shipping_name: string;
  created_at: string | null;
  status: string;
}

interface NotificationsSummaryTicket {
  public_id: string;
  name: string;
  phone: string;
  email: string;
  created_at: string | null;
  status: string;
}

interface NotificationsSummaryResponse {
  new_orders_count: number;
  pending_tickets_count: number;
  recent_orders: NotificationsSummaryOrder[];
  recent_tickets: NotificationsSummaryTicket[];
}

export async function fetchNotifications(): Promise<DashboardNotification[]> {
  try {
    const { data } = await api.get<NotificationsSummaryResponse>(
      "admin/notifications/summary/"
    );
    const notifications: DashboardNotification[] = [];

    for (const order of data.recent_orders ?? []) {
      notifications.push({
        id: `order-${order.public_id}`,
        resourceId: order.public_id,
        type: "new_order",
        title: "New order placed",
        message: `Order #${order.order_number} from ${order.shipping_name}`,
        createdAt: order.created_at ?? "",
        isRead: false,
      });
    }

    for (const item of data.recent_tickets ?? []) {
      notifications.push({
        id: `support-ticket-${item.public_id}`,
        resourceId: item.public_id,
        type: "support_ticket",
        title: "New support ticket",
        message: `${item.name} (${item.phone || item.email})`,
        createdAt: item.created_at ?? "",
        isRead: false,
      });
    }

    return notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

export function markAllAsReadOnClient(
  notifications: DashboardNotification[]
): DashboardNotification[] {
  return notifications.map((n) => ({ ...n, isRead: true }));
}
