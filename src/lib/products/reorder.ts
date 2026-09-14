import api from "@/lib/api";
import type { Product } from "@/types";

export type ProductReorderHttp = Pick<typeof api, "post">;

/** Body of POST admin/products/reorder/ that moves one product next to another. */
export type ProductMovePayload = {
  category_public_id: string;
  product_public_id: string;
  target_public_id: string;
  position: "before" | "after";
};

/**
 * The category a drag on this page reorders: the one category every row belongs to, or null when
 * the page mixes categories (a parent-category filter showing several subcategories) or has fewer
 * than two rows. The server orders a category's direct products by (display_order, name, id), the
 * same order the list shows, so a move between two rows of that category is well defined even when
 * the filter is a parent category.
 */
export function reorderCategoryPublicId(page: readonly Product[]): string | null {
  if (page.length < 2) return null;
  const categories = new Set(page.map((p) => p.category_public_id).filter(Boolean));
  if (categories.size !== 1) return null;
  return [...categories][0] as string;
}

/**
 * A dnd-kit drop from `oldIndex` to `newIndex` as a relative move. arrayMove puts a row dragged
 * down right after the row it was dropped on, and a row dragged up right before it. Null when the
 * drop changes nothing.
 */
export function buildProductMovePayload(
  categoryPublicId: string,
  page: readonly Product[],
  oldIndex: number,
  newIndex: number,
): ProductMovePayload | null {
  const moved = page[oldIndex];
  const target = page[newIndex];
  if (!moved || !target || oldIndex === newIndex) return null;
  return {
    category_public_id: categoryPublicId,
    product_public_id: moved.public_id,
    target_public_id: target.public_id,
    position: oldIndex < newIndex ? "after" : "before",
  };
}

/**
 * Save one drop: a single request whatever the category size. The server recomputes the
 * category's positions and writes only the rows that changed.
 */
export async function saveProductReorder(opts: {
  http?: ProductReorderHttp;
  categoryPublicId: string;
  page: readonly Product[];
  oldIndex: number;
  newIndex: number;
}): Promise<"saved" | "noop"> {
  const { http = api, categoryPublicId, page, oldIndex, newIndex } = opts;
  const payload = buildProductMovePayload(categoryPublicId, page, oldIndex, newIndex);
  if (!payload) return "noop";
  await http.post("admin/products/reorder/", payload);
  return "saved";
}
