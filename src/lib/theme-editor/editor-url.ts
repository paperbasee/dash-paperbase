import { SLOT_PAGES, type SlotPageKey } from "./slot-catalogue";

/**
 * The page the editor is on, in its address (owner, 2026-09-26: "when I am on the checkout page
 * ... if I refresh the page it gets me back to the home page").
 *
 * `/settings/customize?page=checkout` opens the editor on the checkout. A name the editor does not
 * have -- a typo, a page since removed -- opens it on the home page, as the bare address does.
 */
export const EDITOR_PAGE_PARAM = "page";

export function pageFromSearch(search: string): SlotPageKey {
  const wanted = new URLSearchParams(search).get(EDITOR_PAGE_PARAM) ?? "";
  return (SLOT_PAGES as readonly string[]).includes(wanted) ? (wanted as SlotPageKey) : "home";
}

/** The address's query with this page in it, keeping anything else it carries. */
export function searchWithPage(search: string, page: SlotPageKey): string {
  const params = new URLSearchParams(search);
  params.set(EDITOR_PAGE_PARAM, page);
  return `?${params.toString()}`;
}
