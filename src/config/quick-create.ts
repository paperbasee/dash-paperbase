import { OPEN_NEW, OPEN_PARAM } from "@/lib/open-from-address";

/**
 * The sidebar's Add new menu (owner, 2026-10-03): the quick ways to add something, each where the
 * dashboard adds it -- its own new page, or its list page with the add form open (`?open=new`,
 * hooks/useOpenFromAddress). An item shows only where its app does (switched on, the page allowed:
 * useCanShowApp) and to a role the API lets add it (`permission`, the key checked on create), so a
 * role that can add nothing gets no menu. Words: sidebar.addNew_<id>; icon: the app's own.
 */
export interface QuickCreateItem {
  id: string;
  appId: string;
  href: string;
  permission: string;
}

const ADD_IN_PLACE = `?${OPEN_PARAM}=${OPEN_NEW}`;

export const QUICK_CREATE_ITEMS: readonly QuickCreateItem[] = [
  { id: "order", appId: "orders", href: "/orders/new", permission: "orders.edit" },
  { id: "product", appId: "products", href: "/products/new", permission: "products.create" },
  { id: "category", appId: "categories", href: `/categories${ADD_IN_PLACE}`, permission: "categories.manage" },
  { id: "coupon", appId: "coupons", href: `/coupons${ADD_IN_PLACE}`, permission: "coupons.manage" },
  { id: "blogPost", appId: "blog", href: "/blog/new", permission: "blogs.manage" },
  { id: "review", appId: "reviews", href: `/reviews${ADD_IN_PLACE}`, permission: "reviews.manage" },
];

/** The items this person may use in this shop, in the menu's order. */
export function quickCreateItems(
  canShowApp: (appId: string) => boolean,
  has: (permission: string) => boolean
): QuickCreateItem[] {
  return QUICK_CREATE_ITEMS.filter((item) => canShowApp(item.appId) && has(item.permission));
}
