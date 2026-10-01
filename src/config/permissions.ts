/**
 * Client mirror of the API's permission list and its three fixed roles
 * (api-paperbase engine/apps/rbac/catalog.py; roles plan, owner 2026-10-02).
 *
 * This is a UX layer only: it hides pages and buttons a member can't use. The
 * server re-checks every request regardless, so a stale mapping here can never
 * grant access -- at worst it hides something a member may use.
 *
 * **A page shows to whoever can change it** (`APP_PAGE_PERMISSION`), apart from
 * the lists and reports nobody changes and the product list Staff sell from.
 * The roles themselves are fixed: what each holds comes from the API
 * (`/admin/me/permissions/`, `/admin/team/roles/`), never from this file.
 */

/** Every permission key the API knows, in its order (tests/config/permissions.test.ts checks it). */
export const ALL_PERMISSION_KEYS: readonly string[] = [
  "orders.view",
  "orders.edit",
  "orders.export",
  "products.view",
  "products.create",
  "products.edit",
  "products.delete",
  "categories.view",
  "categories.manage",
  "inventory.view",
  "inventory.adjust",
  "customers.view",
  "customers.edit",
  "customers.delete",
  "analytics.view",
  "support.view",
  "support.manage",
  "popups.view",
  "popups.manage",
  "coupons.view",
  "coupons.manage",
  "brands.view",
  "brands.manage",
  "reviews.view",
  "reviews.manage",
  "blogs.view",
  "blogs.manage",
  "shipping.view",
  "shipping.manage",
  "trash.view",
  "trash.restore",
  "trash.purge",
  "theming.view",
  "theming.manage",
  "settings.view",
  "settings.manage",
  "integrations.view",
  "integrations.manage",
  "activity.view",
];

/** The three fixed roles, in the API's order. Nobody edits them or makes their own. */
export const ROLE_SLUGS = ["admin", "manager", "staff"] as const;
export type RoleSlug = (typeof ROLE_SLUGS)[number];

export function isRoleSlug(value: unknown): value is RoleSlug {
  return typeof value === "string" && (ROLE_SLUGS as readonly string[]).includes(value);
}

/** Each role's name and one-line summary, as message names under `settings.team`. */
export const ROLE_MESSAGES: Record<RoleSlug, { name: string; summary: string }> = {
  admin: { name: "roleAdmin", summary: "roleAdminSummary" },
  manager: { name: "roleManager", summary: "roleManagerSummary" },
  staff: { name: "roleStaff", summary: "roleStaffSummary" },
};

/**
 * dash app id (config/apps.ts) → the key that shows its page: the one that
 * changes it, apart from the lists and reports nobody changes (orders,
 * abandoned checkouts, accounts, analytics, Most wished-for) and the product
 * list Staff sell from, which they see read-only.
 * Apps absent here are not permission-gated.
 */
export const APP_PAGE_PERMISSION: Record<string, string> = {
  analytics: "analytics.view",
  products: "products.view",
  orders: "orders.view",
  abandoned_checkouts: "orders.view",
  customers: "customers.view",
  accounts: "customers.view",
  wishlist: "analytics.view",
  categories: "categories.manage",
  brands: "brands.manage",
  reviews: "reviews.manage",
  support_tickets: "support.manage",
  variants: "products.edit",
  product_attributes: "products.edit",
  inventory: "inventory.adjust",
  trash: "trash.restore",
  popup: "popups.manage",
  coupons: "coupons.manage",
  blog: "blogs.manage",
  shipping: "shipping.manage",
};

/**
 * What a role card on Settings → Team says a role can and can't do: one line
 * per area, ticked when the role holds the area's key -- read from the API's
 * own list of the role's keys, so a card can never promise what the API
 * refuses. `unlessHolding`: a line left out when the role holds a wider one
 * ("see the products" says nothing more to a role that changes them).
 * Every `labelKey` names a message under `settings.team`.
 */
export interface RoleArea {
  labelKey: string;
  key: string;
  unlessHolding?: string;
}

export const ROLE_AREAS: readonly RoleArea[] = [
  { labelKey: "areaOrders", key: "orders.edit" },
  { labelKey: "areaOrdersExport", key: "orders.export" },
  { labelKey: "areaCustomers", key: "customers.edit" },
  { labelKey: "areaCustomersDelete", key: "customers.delete" },
  { labelKey: "areaCatalog", key: "products.edit" },
  { labelKey: "areaCatalogSee", key: "products.view", unlessHolding: "products.edit" },
  { labelKey: "areaStock", key: "inventory.adjust" },
  { labelKey: "areaMarketing", key: "coupons.manage" },
  { labelKey: "areaSupport", key: "support.manage" },
  { labelKey: "areaReports", key: "analytics.view" },
  { labelKey: "areaTrashRestore", key: "trash.restore" },
  { labelKey: "areaTrashPurge", key: "trash.purge" },
  { labelKey: "areaDesign", key: "theming.manage" },
  { labelKey: "areaSettings", key: "settings.manage" },
];

/** A role's card lines: each area it can, then each it can't, in `ROLE_AREAS` order. */
export function roleAreas(held: ReadonlySet<string>): { can: RoleArea[]; cannot: RoleArea[] } {
  const shown = ROLE_AREAS.filter((area) => !(area.unlessHolding && held.has(area.unlessHolding)));
  return {
    can: shown.filter((area) => held.has(area.key)),
    cannot: shown.filter((area) => !held.has(area.key) && !area.unlessHolding),
  };
}
