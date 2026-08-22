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
 */

/** Grouped catalog for the role editor: one row per group, presets + advanced. */
export interface PermissionDef {
  key: string;
  label: string;
}

export interface PermissionGroup {
  id: string;
  label: string;
  /** Ordered permissions; the first (…\.view) is the group's "view" gate. */
  permissions: PermissionDef[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "orders",
    label: "Orders",
    permissions: [
      { key: "orders.view", label: "View orders" },
      { key: "orders.edit", label: "Update orders" },
      { key: "orders.refund", label: "Refund orders" },
      { key: "orders.cancel", label: "Cancel orders" },
      { key: "orders.export", label: "Export orders" },
    ],
  },
  {
    id: "products",
    label: "Products",
    permissions: [
      { key: "products.view", label: "View products" },
      { key: "products.create", label: "Create products" },
      { key: "products.edit", label: "Edit products" },
      { key: "products.delete", label: "Delete products" },
    ],
  },
  {
    id: "categories",
    label: "Categories",
    permissions: [
      { key: "categories.view", label: "View categories" },
      { key: "categories.manage", label: "Manage categories" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    permissions: [
      { key: "inventory.view", label: "View inventory" },
      { key: "inventory.adjust", label: "Adjust stock & purchases" },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    permissions: [
      { key: "customers.view", label: "View customers" },
      { key: "customers.edit", label: "Edit customers" },
      { key: "customers.export", label: "Export customers" },
      { key: "customers.delete", label: "Delete customers" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    permissions: [{ key: "analytics.view", label: "View analytics" }],
  },
  {
    id: "support",
    label: "Support tickets",
    permissions: [
      { key: "support.view", label: "View support tickets" },
      { key: "support.manage", label: "Reply to & manage tickets" },
    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    permissions: [
      { key: "notifications.view", label: "View notifications" },
      { key: "notifications.manage", label: "Manage notifications" },
    ],
  },
  {
    id: "banners",
    label: "Banners",
    permissions: [
      { key: "banners.view", label: "View banners" },
      { key: "banners.manage", label: "Manage banners" },
    ],
  },
  {
    id: "popups",
    label: "Popups",
    permissions: [
      { key: "popups.view", label: "View popups" },
      { key: "popups.manage", label: "Manage popups" },
    ],
  },
  {
    id: "blogs",
    label: "Blog",
    permissions: [
      { key: "blogs.view", label: "View blog posts" },
      { key: "blogs.manage", label: "Manage blog posts" },
    ],
  },
  {
    id: "shipping",
    label: "Shipping",
    permissions: [
      { key: "shipping.view", label: "View shipping configuration" },
      { key: "shipping.manage", label: "Manage shipping configuration" },
    ],
  },
  {
    id: "couriers",
    label: "Couriers",
    permissions: [
      { key: "couriers.view", label: "View courier integrations" },
      { key: "couriers.manage", label: "Manage courier integrations" },
    ],
  },
  {
    id: "trash",
    label: "Trash",
    permissions: [
      { key: "trash.view", label: "View trash" },
      { key: "trash.manage", label: "Restore or purge items" },
    ],
  },
  {
    id: "theming",
    label: "Storefront customization",
    permissions: [
      { key: "theming.view", label: "View customization" },
      { key: "theming.manage", label: "Manage customization" },
    ],
  },
  {
    id: "settings",
    label: "Store settings",
    permissions: [
      { key: "settings.view", label: "View store settings" },
      { key: "settings.manage", label: "Manage store settings" },
    ],
  },
  {
    id: "integrations",
    label: "Marketing integrations",
    permissions: [
      { key: "integrations.view", label: "View integrations" },
      { key: "integrations.manage", label: "Manage integrations" },
    ],
  },
  {
    id: "api_keys",
    label: "API keys",
    permissions: [
      { key: "api_keys.view", label: "View API keys" },
      { key: "api_keys.manage", label: "Manage API keys" },
    ],
  },
  {
    id: "activity",
    label: "Activity log",
    permissions: [{ key: "activity.view", label: "View the store activity log" }],
  },
  {
    id: "team",
    label: "Team & roles",
    permissions: [
      { key: "team.view", label: "View team members" },
      { key: "team.invite", label: "Invite & remove members" },
      { key: "team.manage_roles", label: "Create & edit roles" },
    ],
  },
  {
    id: "billing",
    label: "Billing",
    permissions: [
      { key: "billing.view", label: "View billing" },
      { key: "billing.manage", label: "Manage billing" },
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
  banners: "banners.view",
  popup: "popups.view",
  blog: "blogs.view",
  shipping: "shipping.view",
};
