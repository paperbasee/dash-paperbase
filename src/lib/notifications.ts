import api from "@/lib/api";
import type {
  Order,
  Cart,
  WishlistItem,
  ContactSubmission,
  PaginatedResponse,
} from "@/types";

export type NotificationType =
  | "new_order"
  | "added_to_cart"
  | "added_to_wishlist"
  | "contact_submission";

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
    case "added_to_cart":
      return "/carts";
    case "added_to_wishlist":
      return "/wishlist";
    case "contact_submission":
      return "/contacts";
    default:
      return "/";
  }
}

export async function fetchNotifications(): Promise<DashboardNotification[]> {
  const [ordersRes, cartRes, wishlistRes, contactsRes] = await Promise.all([
    api.get<PaginatedResponse<Order>>("/api/admin/orders/"),
    api.get<Cart | PaginatedResponse<Cart>>("/api/admin/carts/"),
    api.get<PaginatedResponse<WishlistItem>>("/api/admin/wishlist/"),
    api.get<PaginatedResponse<ContactSubmission>>("/api/admin/contacts/"),
  ]);

  const notifications: DashboardNotification[] = [];

  const orders = Array.isArray((ordersRes.data as any).results)
    ? (ordersRes.data as PaginatedResponse<Order>).results
    : (ordersRes.data as any as Order[]);
  for (const order of orders) {
    notifications.push({
      id: `order-${order.id}`,
      resourceId: String(order.id),
      type: "new_order",
      title: "New order placed",
      message: `Order #${order.order_number} from ${order.shipping_name}`,
      createdAt: order.created_at,
      isRead: false,
    });
  }

  const cartData = cartRes.data as any;
  const carts: Cart[] = Array.isArray(cartData.results) ? cartData.results : [cartData].filter(
    Boolean
  );
  for (const cart of carts) {
    for (const item of cart.items) {
      notifications.push({
        id: `cart-${item.id}`,
        resourceId: String(item.id),
        type: "added_to_cart",
        title: "Product added to cart",
        message: item.product_name,
        createdAt: item.created_at,
        isRead: false,
      });
    }
  }

  const wishlistItems = (wishlistRes.data as PaginatedResponse<WishlistItem>).results ?? [];
  for (const item of wishlistItems) {
    notifications.push({
      id: `wishlist-${item.id}`,
      resourceId: String(item.id),
      type: "added_to_wishlist",
      title: "Product added to wishlist",
      message: item.product_name,
      createdAt: item.created_at,
      isRead: false,
    });
  }

  const contacts = (contactsRes.data as PaginatedResponse<ContactSubmission>).results ?? [];
  for (const contact of contacts) {
    notifications.push({
      id: `contact-${contact.id}`,
      resourceId: String(contact.id),
      type: "contact_submission",
      title: "New contact submission",
      message: `${contact.name} (${contact.phone || contact.email})`,
      createdAt: contact.created_at,
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

