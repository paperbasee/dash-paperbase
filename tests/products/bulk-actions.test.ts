import { describe, expect, it, vi } from "vitest";
import * as bulk from "@/lib/products/bulk-actions";
import {
  bulkDeleteProducts,
  bulkDeleteTrash,
  bulkRestoreTrash,
  runBulkWithInvalidation,
  type BulkProductHttp,
} from "@/lib/products/bulk-actions";

type Row = { public_id: string; ok: boolean; error: string | null };

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

/**
 * Fake API for both the per-row endpoints and the bulk endpoints. Ids in `failing` fail: the
 * per-row endpoints answer 400, the bulk endpoints report `{ok: false}` for them. `rejectPostCall`
 * makes that bulk POST (1-based) fail as a whole, like a network error.
 */
function fakeHttp(opts: { failing?: string[]; rejectPostCall?: number } = {}) {
  const failing = new Set(opts.failing ?? []);
  const rowError = (id: string) => Object.assign(new Error(`row ${id} failed`), { status: 400 });
  const post = vi.fn(async (url: string, body?: { product_public_ids?: string[] }) => {
    if (opts.rejectPostCall && post.mock.calls.length === opts.rejectPostCall) {
      throw new Error("network down");
    }
    const bulkIds = body?.product_public_ids;
    if (!bulkIds) {
      const id = url.split("/").at(-3) ?? "";
      if (failing.has(id)) throw rowError(id);
      return { data: {} };
    }
    const results: Row[] = bulkIds.map((id) =>
      failing.has(id)
        ? { public_id: id, ok: false, error: "Product not found." }
        : { public_id: id, ok: true, error: null },
    );
    const ok = results.filter((r) => r.ok).length;
    return { data: { results, summary: { ok, failed: results.length - ok } } };
  });
  const del = vi.fn(async (url: string) => {
    const id = url.split("/").at(-2) ?? "";
    if (failing.has(id)) throw rowError(id);
    return { data: {} };
  });
  return { http: { post, delete: del } as unknown as BulkProductHttp, post, del };
}

const actions = [
  ["bulk product delete", bulkDeleteProducts, "admin/products/bulk-delete/"],
  ["trash bulk restore", bulkRestoreTrash, "admin/trash/bulk-restore/"],
  ["trash bulk delete", bulkDeleteTrash, "admin/trash/bulk-delete/"],
] as const;

describe.each(actions)("%s", (_label, action, endpoint) => {
  it.each([3, 24, 150])("sends %i selected products in ceil(N/100) requests", async (n) => {
    const fake = fakeHttp();
    const selected = ids(n);
    const result = await action(fake.http, selected);
    const requests = fake.post.mock.calls.length + fake.del.mock.calls.length;
    expect(requests).toBe(Math.ceil(n / 100));
    expect(fake.del).not.toHaveBeenCalled();
    const sent = fake.post.mock.calls.map((call) => {
      const [url, body] = call as unknown as [string, { product_public_ids: string[] }];
      expect(url).toBe(endpoint);
      expect(body.product_public_ids.length).toBeLessThanOrEqual(100);
      return body.product_public_ids;
    });
    expect(sent.flat()).toEqual(selected);
    expect(result.succeeded).toEqual(selected);
    expect(result.failed).toEqual([]);
  });

  it("reports a failed product without stopping the others", async () => {
    const selected = ids(20);
    const fake = fakeHttp({ failing: ["p5"] });
    const result = await action(fake.http, selected);
    expect(result.succeeded).toHaveLength(19);
    expect(result.succeeded).not.toContain("p5");
    expect(result.failed).toEqual([{ public_id: "p5", error: "Product not found." }]);
  });

  it("keeps what finished when a later request fails as a whole", async () => {
    const selected = ids(150);
    const fake = fakeHttp({ rejectPostCall: 2 });
    const error = await action(fake.http, selected).then(
      () => null,
      (err: unknown) => err,
    );
    expect(error).toBeInstanceOf(bulk.BulkProductActionError);
    const failure = error as InstanceType<typeof bulk.BulkProductActionError>;
    expect(failure.result.succeeded).toEqual(selected.slice(0, 100));
    expect(failure.unprocessed).toEqual(selected.slice(100));
    expect((failure.cause as Error).message).toBe("network down");
  });
});

describe("selection after a bulk action", () => {
  it("leaves only the products that did not go selected", () => {
    const selected = new Set(["a", "b", "c", "d"]);
    const next = bulk.remainingSelection(selected, ["a", "b", "c", "d"], ["a", "b"]);
    expect(next).toEqual(new Set(["c", "d"]));
  });

  it("drops the whole selection when every requested product went", () => {
    const next = bulk.remainingSelection(new Set(["a", "b"]), ["a", "b"], ["a", "b"]);
    expect(next.size).toBe(0);
  });

  it("clears products that were not part of the request, as a full success did before", () => {
    // A successful single-row delete of a row outside the selection used to clear the selection.
    const next = bulk.remainingSelection(new Set(["x", "y"]), ["z"], ["z"]);
    expect(next).toEqual(new Set());
  });
});

describe("selection after a delete request fails as a whole", () => {
  it("a failed row delete leaves the other selected rows selected", () => {
    // Rows x and y are selected; the merchant deletes row z from its own button and it fails.
    const selected = new Set(["x", "y"]);
    const next = bulk.selectionAfterRequestFailure(selected, ["z"], [], { perRow: true });
    expect(next).toEqual(new Set(["x", "y"]));
  });

  it("a failed row delete of the only selected row keeps it selected", () => {
    const next = bulk.selectionAfterRequestFailure(new Set(["z"]), ["z"], [], { perRow: true });
    expect(next).toEqual(new Set(["z"]));
  });

  it("a failed bulk chunk leaves the unprocessed products selected", () => {
    const selected = new Set(["a", "b", "c"]);
    const next = bulk.selectionAfterRequestFailure(selected, ["a", "b", "c"], ["a"], {
      perRow: false,
    });
    expect(next).toEqual(new Set(["b", "c"]));
  });
});

describe("cache invalidation around a bulk action", () => {
  it("invalidates once even when the action fails", async () => {
    const invalidate = vi.fn();
    await expect(
      runBulkWithInvalidation(() => Promise.reject(new Error("boom")), invalidate),
    ).rejects.toThrow("boom");
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("invalidates once after a successful action", async () => {
    const invalidate = vi.fn();
    await expect(runBulkWithInvalidation(async () => 7, invalidate)).resolves.toBe(7);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});

describe("failed product names in the warning", () => {
  it("names up to three failed products and counts the rest", () => {
    const failed = ["a", "b", "c", "d", "e"].map((id) => ({ public_id: id, error: null }));
    const names = new Map([
      ["a", "Alpha"],
      ["b", "Beta"],
    ]);
    expect(bulk.failedProductNames(failed, names)).toEqual({ names: "Alpha, Beta, c", more: 2 });
    expect(bulk.failedProductNames(failed.slice(0, 2), names)).toEqual({
      names: "Alpha, Beta",
      more: 0,
    });
  });
});
