import api from "@/lib/api";

export type BulkProductHttp = Pick<typeof api, "post">;

/** The bulk product endpoints accept at most this many ids per request. */
export const BULK_PRODUCT_IDS_MAX = 100;

export type BulkProductFailure = { public_id: string; error: string | null };

export type BulkProductActionResult = {
  succeeded: string[];
  failed: BulkProductFailure[];
};

type BulkProductResponse = {
  results: { public_id: string; ok: boolean; error: string | null }[];
  summary: { ok: number; failed: number };
};

/**
 * A bulk request failed as a whole (network error, 403, 5xx). `result` holds what the earlier
 * requests already did; `unprocessed` lists the ids whose request never completed.
 */
export class BulkProductActionError extends Error {
  readonly result: BulkProductActionResult;
  readonly unprocessed: string[];

  constructor(result: BulkProductActionResult, unprocessed: string[], cause: unknown) {
    super(cause instanceof Error ? cause.message : "Bulk product action failed.", { cause });
    this.name = "BulkProductActionError";
    this.result = result;
    this.unprocessed = unprocessed;
  }
}

export function chunkIds(ids: readonly string[], size = BULK_PRODUCT_IDS_MAX): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) chunks.push(ids.slice(i, i + size));
  return chunks;
}

/**
 * POST the ids to a bulk endpoint in chunks of 100, one chunk after another (the server locks rows
 * in primary-key order inside each request), and merge the per-product results.
 */
export async function runBulkProductAction(
  http: BulkProductHttp,
  endpoint: string,
  ids: readonly string[],
): Promise<BulkProductActionResult> {
  const result: BulkProductActionResult = { succeeded: [], failed: [] };
  const chunks = chunkIds(ids);
  for (let i = 0; i < chunks.length; i++) {
    let data: BulkProductResponse;
    try {
      ({ data } = await http.post<BulkProductResponse>(endpoint, {
        product_public_ids: chunks[i],
      }));
    } catch (err) {
      throw new BulkProductActionError(result, chunks.slice(i).flat(), err);
    }
    for (const row of data.results) {
      if (row.ok) result.succeeded.push(row.public_id);
      else result.failed.push({ public_id: row.public_id, error: row.error });
    }
  }
  return result;
}

/** Store members move the products to trash; superusers delete them permanently. */
export function bulkDeleteProducts(http: BulkProductHttp, ids: readonly string[]) {
  return runBulkProductAction(http, "admin/products/bulk-delete/", ids);
}

export function bulkRestoreTrash(http: BulkProductHttp, ids: readonly string[]) {
  return runBulkProductAction(http, "admin/trash/bulk-restore/", ids);
}

export function bulkDeleteTrash(http: BulkProductHttp, ids: readonly string[]) {
  return runBulkProductAction(http, "admin/trash/bulk-delete/", ids);
}

/**
 * The selection after a bulk action: the requested products that did not go (failed, or never
 * processed) and were selected. Everything else is cleared, as a fully successful action did.
 */
export function remainingSelection(
  selected: ReadonlySet<string>,
  requested: readonly string[],
  succeeded: readonly string[],
): Set<string> {
  const went = new Set(succeeded);
  return new Set(requested.filter((id) => selected.has(id) && !went.has(id)));
}

/**
 * The selection after a request failed as a whole. A row's own delete button (`perRow`) leaves
 * the selection as it was, as a failed delete always did. A failed bulk request keeps selected
 * the requested products that did not go, so the merchant can retry them.
 */
export function selectionAfterRequestFailure<S extends ReadonlySet<string>>(
  selected: S,
  requested: readonly string[],
  succeeded: readonly string[],
  opts: { perRow: boolean },
): S | Set<string> {
  if (opts.perRow) return selected;
  return remainingSelection(selected, requested, succeeded);
}

/** Run a bulk action and refresh the caches afterwards, whether it succeeded or not. */
export async function runBulkWithInvalidation<T>(
  fn: () => Promise<T>,
  invalidate: () => void,
): Promise<T> {
  try {
    return await fn();
  } finally {
    invalidate();
  }
}

/** Up to `limit` failed product names (public id when the name is unknown) plus how many more. */
export function failedProductNames(
  failed: readonly { public_id: string }[],
  nameById: ReadonlyMap<string, string>,
  limit = 3,
): { names: string; more: number } {
  const shown = failed.slice(0, limit).map((f) => nameById.get(f.public_id)?.trim() || f.public_id);
  return { names: shown.join(", "), more: Math.max(0, failed.length - limit) };
}
