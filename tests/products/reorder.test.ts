import { describe, expect, it, vi } from "vitest";
import { arrayMove } from "@dnd-kit/sortable";
import * as reorder from "@/lib/products/reorder";
import { saveProductReorder, type ProductReorderHttp } from "@/lib/products/reorder";
import type { Product } from "@/types";

const CATEGORY = "cat-1";

function makeProducts(n: number, category = CATEGORY): Product[] {
  return Array.from(
    { length: n },
    (_, i) =>
      ({
        public_id: `p${String(i).padStart(5, "0")}`,
        name: `Product ${String(i).padStart(5, "0")}`,
        display_order: i,
        category_public_id: category,
      }) as Product,
  );
}

/**
 * Fake API serving a category of `n` products in 24-row cursor pages (the admin products list
 * default). `loopCursor` makes every page point at the same next cursor; the fake refuses to serve
 * more than `maxGets` pages so a crawl that never ends fails the test instead of hanging.
 */
function fakeCategoryHttp(n: number, opts: { loopCursor?: boolean; maxGets?: number } = {}) {
  const all = makeProducts(n);
  const maxGets = opts.maxGets ?? Number.POSITIVE_INFINITY;
  const get = vi.fn(async (_url: string, config?: { params?: Record<string, string> }) => {
    if (get.mock.calls.length > maxGets) throw new Error("crawl did not stop");
    const offset = opts.loopCursor ? 0 : Number(config?.params?.cursor?.slice(1) ?? 0);
    const results = all.slice(offset, offset + 24);
    const nextOffset = offset + 24;
    const next =
      opts.loopCursor || nextOffset < n
        ? `https://x/api/v1/admin/products/?cursor=c${opts.loopCursor ? 0 : nextOffset}`
        : null;
    return { data: { results, next, previous: null } };
  });
  const post = vi.fn(async () => ({ data: { detail: "ok", updated: 1 } }));
  return { http: { get, post } as unknown as ProductReorderHttp, get, post, all };
}

describe("product drag reorder", () => {
  it.each([24, 1200])(
    "saves one drop with one request and no category crawl (%i products in the category)",
    async (n) => {
      const fake = fakeCategoryHttp(n);
      const page = fake.all.slice(0, 24);
      await saveProductReorder({
        http: fake.http,
        categoryPublicId: CATEGORY,
        page,
        oldIndex: 0,
        newIndex: 3,
      });
      expect(fake.get).toHaveBeenCalledTimes(0);
      expect(fake.post).toHaveBeenCalledTimes(1);
      const [url, body] = fake.post.mock.calls[0] as unknown as [string, Record<string, unknown>];
      expect(url).toBe("admin/products/reorder/");
      expect(body).not.toHaveProperty("product_public_ids");
      expect(body).toEqual({
        category_public_id: CATEGORY,
        product_public_id: page[0].public_id,
        target_public_id: page[3].public_id,
        position: "after",
      });
    },
  );

  it("finishes even when the list's next cursor repeats forever", async () => {
    const fake = fakeCategoryHttp(48, { loopCursor: true, maxGets: 10 });
    await expect(
      saveProductReorder({
        http: fake.http,
        categoryPublicId: CATEGORY,
        page: fake.all.slice(0, 24),
        oldIndex: 5,
        newIndex: 1,
      }),
    ).resolves.toBeDefined();
    expect(fake.post).toHaveBeenCalledTimes(1);
  });

  it("describes the move the way dnd-kit arrayMove places the row", () => {
    const page = makeProducts(6);
    const down = reorder.buildProductMovePayload(CATEGORY, page, 0, 3);
    expect(down).toEqual({
      category_public_id: CATEGORY,
      product_public_id: "p00000",
      target_public_id: "p00003",
      position: "after",
    });
    const up = reorder.buildProductMovePayload(CATEGORY, page, 3, 0);
    expect(up).toEqual({
      category_public_id: CATEGORY,
      product_public_id: "p00003",
      target_public_id: "p00000",
      position: "before",
    });

    // Applying before/after to the page gives exactly arrayMove's result, in both directions.
    const applyMove = (rows: Product[], payload: NonNullable<typeof down>) => {
      const moved = rows.find((r) => r.public_id === payload.product_public_id)!;
      const rest = rows.filter((r) => r !== moved);
      const at = rest.findIndex((r) => r.public_id === payload.target_public_id);
      rest.splice(payload.position === "before" ? at : at + 1, 0, moved);
      return rest.map((r) => r.public_id);
    };
    for (let from = 0; from < page.length; from++) {
      for (let to = 0; to < page.length; to++) {
        const payload = reorder.buildProductMovePayload(CATEGORY, page, from, to);
        if (from === to) {
          expect(payload).toBeNull();
          continue;
        }
        expect(applyMove(page, payload!)).toEqual(
          arrayMove(page, from, to).map((r) => r.public_id),
        );
      }
    }
  });

  it("reorders within the page's own category, also under a parent-category filter", () => {
    expect(reorder.reorderCategoryPublicId(makeProducts(3, "child"))).toBe("child");
    const mixed = [...makeProducts(2, "a"), ...makeProducts(1, "b")];
    expect(reorder.reorderCategoryPublicId(mixed)).toBeNull();
    expect(reorder.reorderCategoryPublicId(makeProducts(1, "a"))).toBeNull();
  });
});
