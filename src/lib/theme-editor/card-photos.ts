/*
 * Cards that follow their photo, category by category (owner, 2026-10-04).
 *
 * The theme's `card_photos` setting holds the categories a merchant ticked -- and the ones
 * they unticked inside a ticked one -- as `{ public id: true or false }`. A category it does
 * not name takes its parent's answer, and a top-level one it does not name is off: ticking
 * Women covers Dresses, and a sub-category added under Women next year. The shop reads it
 * the same way (shop-paperbase `storefront/card_photos.py`); the API checks its shape
 * (api-paperbase `documents._validate_category_ticks`).
 *
 * A tick is written as the SMALLEST map that says it: a category is named only where its
 * answer differs from its parent's, so ticking Women after ticking Dresses leaves one entry,
 * not two, and unticking Women leaves nothing behind.
 */

/** The theme setting. */
export const CARD_PHOTOS = "card_photos";

export type CategoryTicks = Record<string, boolean>;

/** A category as the tree lists it: the dashboard's `AdminCategoryTreeNode` is one. */
export type CategoryNode = { public_id: string; name: string; children?: readonly CategoryNode[] };
type Node = CategoryNode;

/** The ticks a document holds; nothing ticked when they are missing or odd. */
export function ticksIn(settings: Record<string, unknown> | undefined): CategoryTicks {
  const raw = settings?.[CARD_PHOTOS];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: CategoryTicks = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "boolean") out[key] = value;
  }
  return out;
}

/** Each category in the tree, by public id, with its parent's (null at the top). */
export function parentsOf(tree: readonly Node[]): Map<string, string | null> {
  const found = new Map<string, string | null>();
  const walk = (nodes: readonly Node[] | undefined, parent: string | null) => {
    for (const node of nodes ?? []) {
      found.set(node.public_id, parent);
      walk(node.children, node.public_id);
    }
  };
  walk(tree, null);
  return found;
}

/** Whether a category's cards follow their photo: its own tick, else the nearest above it. */
export function follows(ticks: CategoryTicks, id: string | null, parents: Map<string, string | null>): boolean {
  const seen = new Set<string>();
  let at = id;
  while (at && !seen.has(at)) {
    if (at in ticks) return ticks[at];
    seen.add(at);
    at = parents.get(at) ?? null;
  }
  return false;
}

function descendants(tree: readonly Node[], id: string): string[] {
  const out: string[] = [];
  const collect = (nodes: readonly Node[] | undefined) => {
    for (const node of nodes ?? []) {
      out.push(node.public_id);
      collect(node.children);
    }
  };
  const find = (nodes: readonly Node[] | undefined): boolean => {
    for (const node of nodes ?? []) {
      if (node.public_id === id) {
        collect(node.children);
        return true;
      }
      if (find(node.children)) return true;
    }
    return false;
  };
  find(tree);
  return out;
}

/**
 * The ticks after a merchant ticks or unticks one category: it and everything under it take
 * the new answer, and categories no longer in the shop are dropped.
 */
export function toggled(ticks: CategoryTicks, tree: readonly Node[], id: string): CategoryTicks {
  const parents = parentsOf(tree);
  const next: CategoryTicks = {};
  for (const [key, value] of Object.entries(ticks)) {
    if (parents.has(key)) next[key] = value;
  }
  const on = !follows(next, id, parents);
  for (const below of descendants(tree, id)) delete next[below];
  delete next[id];
  // Named only where it differs from what it would take from above.
  if (follows(next, parents.get(id) ?? null, parents) !== on) next[id] = on;
  return next;
}

/** The categories whose cards follow their photo, top-most first: what the list of places says. */
export function followingNames(ticks: CategoryTicks, tree: readonly Node[]): string[] {
  const parents = parentsOf(tree);
  const names: string[] = [];
  const walk = (nodes: readonly Node[] | undefined) => {
    for (const node of nodes ?? []) {
      // A category is named when it starts a run: it follows and its parent does not.
      const parent = parents.get(node.public_id) ?? null;
      if (follows(ticks, node.public_id, parents) && !follows(ticks, parent, parents)) names.push(node.name);
      walk(node.children);
    }
  };
  walk(tree);
  return names;
}
