/**
 * How a dashboard list is paged, in one place.
 *
 * The three sizes are the API's (engine/core/pagination.py, PAGE_SIZES): a size outside the set
 * snaps to the nearest there, so the dashboard can never ask for a page the API will not serve.
 */

export const PAGE_SIZES = [24, 48, 96] as const;

export type PageSize = (typeof PAGE_SIZES)[number];

export const DEFAULT_PAGE_SIZE: PageSize = PAGE_SIZES[0];

/** A size from the web address, or the default when it is not one of ours. */
export function parsePageSize(value: string | null | undefined): PageSize {
  const asked = Number(value);
  return (PAGE_SIZES as readonly number[]).includes(asked)
    ? (asked as PageSize)
    : DEFAULT_PAGE_SIZE;
}

/**
 * The page buttons to draw: every page while there are few, otherwise both ends, the page being
 * read and its two neighbours, with a gap for the stretches left out.
 *
 * Widening the row near either end keeps it the same width wherever the merchant is, so the
 * buttons do not shuffle under the pointer -- and it is also why a gap always stands for at
 * least two pages, never for one hidden number.
 */
export function pageButtons(page: number, pages: number): (number | "gap")[] {
  if (pages <= 7) {
    return Array.from({ length: Math.max(pages, 1) }, (_, index) => index + 1);
  }

  const wanted = new Set<number>([1, pages, page - 1, page, page + 1]);
  if (page <= 4) [2, 3, 4, 5].forEach((near) => wanted.add(near));
  if (page >= pages - 3) [pages - 4, pages - 3, pages - 2, pages - 1].forEach((near) => wanted.add(near));

  const shown = [...wanted].filter((one) => one >= 1 && one <= pages).sort((a, b) => a - b);

  const out: (number | "gap")[] = [];
  shown.forEach((one, index) => {
    const before = shown[index - 1];
    if (before !== undefined && one - before > 1) out.push("gap");
    out.push(one);
  });
  return out;
}

export type ListPageParams = { page: number; pageSize: number };

/**
 * What a list asks the API for.
 *
 * Page 1 and the default size are left out, so the list as it opens is one set of parameters --
 * one key in the dashboard's cache and one in the API's, rather than two that mean the same.
 */
export function listPageQuery({ page, pageSize }: ListPageParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (page > 1) query.page = String(page);
  if (pageSize !== DEFAULT_PAGE_SIZE) query.page_size = String(pageSize);
  return query;
}

/** The part of a query key that says which page of a list it is. */
export function listPageKey({ page, pageSize }: ListPageParams) {
  return [page, pageSize] as const;
}
