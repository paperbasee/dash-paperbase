import type { ThemeDocument } from "./api";
import { pageSections, type PageKey } from "./document-ops";
import { SLOTS, type SlotPageKey } from "./slot-catalogue";
import { sectionFor, sectionTypesOf, wiringFor } from "./slot-sections";

/*
 * The editor's page is the real shop (owner, 2026-09-26): the merchant's draft, framed from the
 * preview host, and a merchant picks what to change by pointing at their own page.
 *
 * The page marks itself in the preview and nowhere else (shop-paperbase
 * `rendering._marked` and the `place` filter), and its script reports what the pointer is over
 * and what was clicked, as a MARK:
 *
 *   section + where   which section of the merchant's document, and the list it is in
 *   place             the editor's own name for the part, `page:key`, where one section is
 *                     several places -- the header's logo, menu and button; the cart's nine
 *
 * This file is the one place a mark becomes one of the editor's places and a place becomes a
 * mark again, so the page's script never needs to know the editor's list.
 */

/** What the preview's script says a part of the page is. */
export type PreviewMark = { section: string; where: string; place: string };

/** One of the editor's places, by the page that OWNS it -- the header's logo is `header:logo` on every page. */
export type PlaceRef = { page: SlotPageKey; key: string };

export const PREVIEW_MODE_MESSAGE = "pb-preview:mode";
export const PREVIEW_OUTLINE_MESSAGE = "pb-preview:outline";

export type PickMessage = { type: "hover" | "select"; mark: PreviewMark | null };

const isText = (value: unknown): value is string => typeof value === "string";

/**
 * A pointer or click report from the preview, or null for anything else -- including any message
 * that is not from the frame this editor opened, on the preview's own origin.
 */
export function readPickMessage(
  event: { origin: string; source: unknown; data: unknown },
  origin: string,
  frame: unknown,
): PickMessage | null {
  if (!frame || event.origin !== origin || event.source !== frame) return null;
  const data = event.data as Record<string, unknown> | null;
  if (!data || typeof data !== "object") return null;
  const type = data.type === "pb-preview:hover" ? "hover" : data.type === "pb-preview:select" ? "select" : null;
  if (!type) return null;
  if (data.target === null) return { type, mark: null };
  const target = data.target as Record<string, unknown> | undefined;
  if (!target || typeof target !== "object") return null;
  const { section, where, place } = target;
  if (!isText(section) || !isText(where) || !isText(place)) return null;
  return { type, mark: { section, where, place } };
}

/** Every place that owns its settings, in the editor's order. */
const OWNED: PlaceRef[] = (Object.keys(SLOTS) as SlotPageKey[]).flatMap((page) =>
  SLOTS[page].filter((slot) => !slot.inheritedFrom).map((slot) => ({ page, key: slot.key })),
);

/** `header:logo` as the editor's place, when the editor has one by that name. */
export function namedPlace(name: string): PlaceRef | null {
  const [page, key, ...rest] = name.split(":");
  if (!page || !key || rest.length) return null;
  return OWNED.find((ref) => ref.page === page && ref.key === key) ?? null;
}

/** The document list a section came from: `header`, `footer`, or `templates.<page>`. */
function listOf(where: string): PageKey | null {
  if (!where) return null;
  return where === "header" || where === "footer" ? where : `templates.${where}`;
}

/**
 * The place a mark is. Its own name when the page gave one; otherwise the first place of the
 * section it is in -- the header's background is its Design, a promo band is the Promo strip.
 * Null for a part of the page the editor has no place for.
 */
export function placeForMark(mark: PreviewMark, document: ThemeDocument): PlaceRef | null {
  if (mark.place) {
    const named = namedPlace(mark.place);
    if (named) return named;
  }
  const list = listOf(mark.where);
  if (!list || !mark.section) return null;
  const section = pageSections(document, list).find((one) => one.id === mark.section);
  if (!section) return null;
  return (
    OWNED.find(({ page, key }) => {
      const wiring = wiringFor(page, key);
      return wiring?.page === list && sectionTypesOf(wiring).includes(section.type);
    }) ?? null
  );
}

/**
 * The mark to outline for a place. The page outlines the parts marked with its name where it has
 * any, and otherwise the whole section the place edits.
 */
export function markForPlace(ref: PlaceRef, document: ThemeDocument): PreviewMark {
  const wiring = wiringFor(ref.page, ref.key);
  const section = wiring ? sectionFor(document, wiring) : null;
  const where = wiring?.page.startsWith("templates.") ? wiring.page.slice("templates.".length) : (wiring?.page ?? "");
  return { place: `${ref.page}:${ref.key}`, section: section?.id ?? "", where: section ? where : "" };
}

export type PlaceGroup = { group: "header" | "page" | "footer"; places: PlaceRef[] };

/**
 * Every place on one page, top to bottom: the header's, the page's own, the footer's. The list
 * beside the preview is how a merchant reaches the places the page cannot show them -- one set to
 * nothing, a cart that is not empty, whether the header stays on screen.
 *
 * A place drawn here but owned elsewhere is listed as ITS owner's: the product page's promises
 * are the home page's Promises place.
 */
export function placesOn(page: SlotPageKey): PlaceGroup[] {
  const header: PlaceRef[] = [];
  const own: PlaceRef[] = [];
  const footer: PlaceRef[] = [];
  const all = (group: "header" | "footer", except: string[] = []) =>
    SLOTS[group].filter((slot) => !except.includes(slot.key)).map((slot) => ({ page: group, key: slot.key }));

  for (const slot of SLOTS[page]) {
    const source = slot.inheritedFrom;
    if (source?.page === "header") {
      // The whole header comes with its Design place; the notice strip is a place of its own.
      header.push(...(source.key === "layout" ? all("header", ["notice"]) : [{ page: "header" as const, key: source.key }]));
    } else if (source?.page === "footer") {
      footer.push(...(source.key === "layout" ? all("footer") : [{ page: "footer" as const, key: source.key }]));
    } else {
      own.push(source ?? { page, key: slot.key });
    }
  }
  return [
    { group: "header" as const, places: header },
    { group: "page" as const, places: own },
    { group: "footer" as const, places: footer },
  ].filter((one) => one.places.length > 0);
}

/** The editor page a template's preview is, or null for one the editor has no page for. */
export const TEMPLATE_PAGES: Record<string, SlotPageKey> = {
  "templates.home": "home",
  "templates.category": "category",
  "templates.product": "product",
  "templates.search": "search",
  "templates.blog": "blog",
  "templates.blog_article": "article",
  "templates.reviews": "reviews",
  "templates.wishlist": "wishlist",
  "templates.account": "account",
  "templates.cart": "cart",
  "templates.checkout": "checkout",
};

/** The template an editor page previews. */
export function templateOf(page: SlotPageKey): PageKey | null {
  const found = Object.entries(TEMPLATE_PAGES).find(([, value]) => value === page);
  return found ? (found[0] as PageKey) : null;
}
