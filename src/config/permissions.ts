/**
 * Client mirror of the server RBAC catalog (engine/apps/rbac/catalog.py).
 *
 * This is a UX layer only: it hides sidebar items and disables buttons the
 * user can't use. The server re-checks every request regardless, so a stale
 * or wrong mapping here can never grant access — at worst it hides something
 * a user is actually allowed to use (fixed by syncing this file).
 *
 * Permission groups match the catalog GROUPS; the dash app ids in
 * `config/apps.ts` map onto a group's `.view` key via APP_VIEW_PERMISSION.
 *
 * Every name a merchant reads is a message key under `settings.team`, not a
 * word: the role editor renders it with `t(labelKey)`, so this file stays a
 * pure mirror of the API catalogue in one language-free place.
 */

/** Grouped catalog for the role editor: one row per group, presets + advanced. */
export interface PermissionDef {
  key: string;
  /** Names this permission under `settings.team`. */
  labelKey: string;
}

export interface PermissionGroup {
  id: string;
  /** Names this group under `settings.team`. */
  labelKey: string;
  /** Ordered permissions; the first (…\.view) is the group's "view" gate. */
  permissions: PermissionDef[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "orders",
    labelKey: "groupOrders",
    permissions: [
      { key: "orders.view", labelKey: "permOrdersView" },
      { key: "orders.edit", labelKey: "permOrdersEdit" },
      { key: "orders.refund", labelKey: "permOrdersRefund" },
      { key: "orders.cancel", labelKey: "permOrdersCancel" },
      { key: "orders.export", labelKey: "permOrdersExport" },
    ],
  },
  {
    id: "products",
    labelKey: "groupProducts",
    permissions: [
      { key: "products.view", labelKey: "permProductsView" },
      { key: "products.create", labelKey: "permProductsCreate" },
      { key: "products.edit", labelKey: "permProductsEdit" },
      { key: "products.delete", labelKey: "permProductsDelete" },
    ],
  },
  {
    id: "categories",
    labelKey: "groupCategories",
    permissions: [
      { key: "categories.view", labelKey: "permCategoriesView" },
      { key: "categories.manage", labelKey: "permCategoriesManage" },
    ],
  },
  {
    id: "inventory",
    labelKey: "groupInventory",
    permissions: [
      { key: "inventory.view", labelKey: "permInventoryView" },
      { key: "inventory.adjust", labelKey: "permInventoryAdjust" },
    ],
  },
  {
    id: "customers",
    labelKey: "groupCustomers",
    permissions: [
      { key: "customers.view", labelKey: "permCustomersView" },
      { key: "customers.edit", labelKey: "permCustomersEdit" },
      { key: "customers.export", labelKey: "permCustomersExport" },
      { key: "customers.delete", labelKey: "permCustomersDelete" },
    ],
  },
  {
    id: "analytics",
    labelKey: "groupAnalytics",
    permissions: [{ key: "analytics.view", labelKey: "permAnalyticsView" }],
  },
  {
    id: "support",
    labelKey: "groupSupport",
    permissions: [
      { key: "support.view", labelKey: "permSupportView" },
      { key: "support.manage", labelKey: "permSupportManage" },
    ],
  },
  {
    id: "notifications",
    labelKey: "groupNotifications",
    permissions: [
      { key: "notifications.view", labelKey: "permNotificationsView" },
      { key: "notifications.manage", labelKey: "permNotificationsManage" },
    ],
  },
  {
    // No dashboard screen since 2026-09-18: a theme holds its own pictures. The
    // permission stays because the API's banners endpoints do, and this file is a
    // mirror of its catalogue; it goes when those endpoints go.
    id: "banners",
    labelKey: "groupBanners",
    permissions: [
      { key: "banners.view", labelKey: "permBannersView" },
      { key: "banners.manage", labelKey: "permBannersManage" },
    ],
  },
  {
    id: "popups",
    labelKey: "groupPopups",
    permissions: [
      { key: "popups.view", labelKey: "permPopupsView" },
      { key: "popups.manage", labelKey: "permPopupsManage" },
    ],
  },
  {
    id: "coupons",
    labelKey: "groupCoupons",
    permissions: [
      { key: "coupons.view", labelKey: "permCouponsView" },
      { key: "coupons.manage", labelKey: "permCouponsManage" },
    ],
  },
  {
    id: "blogs",
    labelKey: "groupBlogs",
    permissions: [
      { key: "blogs.view", labelKey: "permBlogsView" },
      { key: "blogs.manage", labelKey: "permBlogsManage" },
    ],
  },
  {
    id: "shipping",
    labelKey: "groupShipping",
    permissions: [
      { key: "shipping.view", labelKey: "permShippingView" },
      { key: "shipping.manage", labelKey: "permShippingManage" },
    ],
  },
  {
    id: "couriers",
    labelKey: "groupCouriers",
    permissions: [
      { key: "couriers.view", labelKey: "permCouriersView" },
      { key: "couriers.manage", labelKey: "permCouriersManage" },
    ],
  },
  {
    id: "trash",
    labelKey: "groupTrash",
    permissions: [
      { key: "trash.view", labelKey: "permTrashView" },
      { key: "trash.manage", labelKey: "permTrashManage" },
    ],
  },
  {
    id: "theming",
    labelKey: "groupTheming",
    permissions: [
      { key: "theming.view", labelKey: "permThemingView" },
      { key: "theming.manage", labelKey: "permThemingManage" },
    ],
  },
  {
    id: "domains",
    labelKey: "groupDomains",
    permissions: [
      { key: "domains.view", labelKey: "permDomainsView" },
      { key: "domains.manage", labelKey: "permDomainsManage" },
    ],
  },
  {
    id: "settings",
    labelKey: "groupSettings",
    permissions: [
      { key: "settings.view", labelKey: "permSettingsView" },
      { key: "settings.manage", labelKey: "permSettingsManage" },
    ],
  },
  {
    id: "integrations",
    labelKey: "groupIntegrations",
    permissions: [
      { key: "integrations.view", labelKey: "permIntegrationsView" },
      { key: "integrations.manage", labelKey: "permIntegrationsManage" },
    ],
  },
  {
    id: "activity",
    labelKey: "groupActivity",
    permissions: [{ key: "activity.view", labelKey: "permActivityView" }],
  },
  {
    id: "team",
    labelKey: "groupTeam",
    permissions: [
      { key: "team.view", labelKey: "permTeamView" },
      { key: "team.invite", labelKey: "permTeamInvite" },
      { key: "team.manage_roles", labelKey: "permTeamManageRoles" },
    ],
  },
  {
    id: "billing",
    labelKey: "groupBilling",
    permissions: [
      { key: "billing.view", labelKey: "permBillingView" },
      { key: "billing.manage", labelKey: "permBillingManage" },
    ],
  },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key)
);

/**
 * Server-side requires-closure, mirrored so the editor auto-checks implied
 * permissions: every non-view key implies its group's `.view`.
 */
export function expandPermissionKeys(keys: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const key of keys) {
    out.add(key);
    const group = key.split(".", 1)[0];
    out.add(`${group}.view`);
  }
  return out;
}

/**
 * dash app id (config/apps.ts) → permission key that gates its sidebar item.
 * Apps absent here are not permission-gated (e.g. always-visible tooling).
 */
export const APP_VIEW_PERMISSION: Record<string, string> = {
  analytics: "analytics.view",
  products: "products.view",
  orders: "orders.view",
  customers: "customers.view",
  categories: "categories.view",
  support_tickets: "support.view",
  cta: "notifications.view",
  variants: "products.view",
  product_attributes: "products.view",
  inventory: "inventory.view",
  trash: "trash.view",
  popup: "popups.view",
  coupons: "coupons.view",
  blog: "blogs.view",
  shipping: "shipping.view",
};
