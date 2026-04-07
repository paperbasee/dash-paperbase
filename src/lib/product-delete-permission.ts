/**
 * Mirrors admin API: DELETE /admin/products/ is allowed for platform superusers
 * and store OWNER / ADMIN for the active store (not STAFF).
 *
 * auth/me/ returns `role` as Django's get_role_display() (e.g. "Owner", "Admin").
 */
export type MeForProductDeletePermission = {
  is_superuser?: boolean;
  active_store_public_id?: string | null;
  store?: { public_id: string; role: string } | null;
};

const DELETE_PRODUCT_ROLES = new Set(["owner", "admin"]);

export function canUserDeleteProducts(me: MeForProductDeletePermission): boolean {
  if (me.is_superuser) return true;
  const active = me.active_store_public_id;
  const row = me.store;
  if (!active || !row?.public_id || row.public_id !== active) return false;
  if (!row.role) return false;
  const normalized = row.role.trim().toLowerCase();
  return DELETE_PRODUCT_ROLES.has(normalized);
}
