/*
 * Cards that follow their photo, by main category (owner, 2026-10-04).
 *
 * The theme's `card_photos` setting holds the MAIN categories a merchant ticked, as a list of
 * public ids -- only main categories can be ticked ("only the parent categories can be
 * selected"). A ticked one covers everything filed under it, and a sub-category added under
 * it next year: the shop reads it that way (shop-paperbase `storefront/card_photos.py`), and
 * the API checks its shape (api-paperbase `documents._validate_categories`).
 */

/** The theme setting. */
export const CARD_PHOTOS = "card_photos";

/** A category as the tree lists it: the dashboard's `AdminCategoryTreeNode` is one. */
export type CategoryNode = { public_id: string; name: string; children?: readonly CategoryNode[] };

/** The categories a document has ticked; none when they are missing or odd. */
export function pickedIn(settings: Record<string, unknown> | undefined): string[] {
  const raw = settings?.[CARD_PHOTOS];
  return Array.isArray(raw) ? raw.filter((entry): entry is string => typeof entry === "string") : [];
}

/**
 * The list after a merchant ticks or unticks one main category, in the shop's own order of
 * them. Anything that is not a main category today -- one deleted, or moved under another --
 * is dropped, since the shop would not read it.
 */
export function toggled(picked: readonly string[], tree: readonly CategoryNode[], id: string): string[] {
  const on = new Set(picked);
  if (on.has(id)) on.delete(id);
  else on.add(id);
  return tree.map((node) => node.public_id).filter((publicId) => on.has(publicId));
}

/** The ticked main categories by name, in the shop's order: what the list of places says. */
export function followingNames(picked: readonly string[], tree: readonly CategoryNode[]): string[] {
  const on = new Set(picked);
  return tree.filter((node) => on.has(node.public_id)).map((node) => node.name);
}
