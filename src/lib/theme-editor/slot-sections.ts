import type { ThemeDocument, ThemeSection } from "@/lib/theme-editor/api";
import { pageSections, type PageKey } from "@/lib/theme-editor/document-ops";
import type { EditorAction } from "@/lib/theme-editor/editor-reducer";
import { SLOTS, type Slot, type SlotPageKey } from "@/lib/theme-editor/slot-catalogue";

/**
 * Which place on the canvas is which section of the shop's document.
 *
 * The slot catalogue describes the editor a merchant sees; the theme manifest
 * describes what the storefront can draw. This is the one file that says they
 * are the same thing, place by place. A slot that is in here is **wired**: its
 * choice is read from the shop's own document and every edit is written back to
 * it. A slot that is not is still the drawing it has always been.
 *
 * One entry at a time, deliberately. A place goes in here when its section can
 * do everything the place promises -- so a merchant never meets a choice that
 * changes nothing, which is the whole complaint that started this work.
 */
export type WiredSlot = {
  /** The list in the document that holds it: a group, or `templates.<name>`. */
  page: PageKey;
  /**
   * What each of this place's values IS: a section type, and the settings that
   * make the section into THAT value.
   *
   * Three shapes, in the order they turned up:
   *
   *   one section        the notice strip is an announcement bar or nothing
   *   two sections       the hero is pictures or a video -- different sections,
   *                      so choosing one hides the other rather than removing
   *                      it, and a merchant who tries the video still has the
   *                      pictures they chose
   *   one section, two   the category band is tiles or a row of names: the same
   *   shapes             section with `layout` set differently, because the
   *                      merchant is choosing how it LOOKS. Two sections would
   *                      let them put both on the page.
   */
  sections: Record<string, string | { type: string; settings: Record<string, unknown> }>;
  /**
   * The value that means nothing is here, when the place offers one. A place
   * whose every choice is a section (the hero) has none.
   */
  off?: string;
};

/** Wired places, by the page picker entry that edits them. */
export const WIRED_SLOTS: Partial<Record<SlotPageKey, Record<string, WiredSlot>>> = {
  header: {
    notice: { page: "header", sections: { message: "announcement_bar" }, off: "off" },
  },
  home: {
    hero: {
      page: "templates.home",
      sections: { slider: "banner_slider", video: "video" },
    },
    categories: {
      page: "templates.home",
      sections: {
        tiles: { type: "category_tiles", settings: { layout: "tiles" } },
        strip: { type: "category_tiles", settings: { layout: "strip" } },
      },
      off: "off",
    },
    /*
      The shop's promises -- cash on delivery, easy returns -- ticked four at a
      time out of sixteen. Two shapes of ONE section, like the category band:
      the merchant is choosing how their promises look, not what they are, and
      two sections would let them put both on the page.

      Picked here and drawn in two places: the product page's Promises is an
      inherited slot pointing back at this one, the way the notice strip is
      owned by the Header entry and drawn everywhere.
    */
    trust: {
      page: "templates.home",
      sections: {
        icons: { type: "promises", settings: { layout: "marks" } },
        line: { type: "promises", settings: { layout: "line" } },
      },
      off: "off",
    },
    featured: { page: "templates.home", sections: { row: "featured_products" }, off: "off" },
    /*
      The three departments. One value and no `off`: the theme marks this
      section required, so it cannot be hidden or removed -- what a merchant
      decides is which three, not whether.
    */
    bands: { page: "templates.home", sections: { on: "category_products" } },
    /*
      The promotion: one section, three layouts, exactly like the category
      band's two shapes. `none` hides it rather than removing it -- a merchant
      who takes a sale down for a fortnight keeps the words they wrote.
    */
    promo: {
      page: "templates.home",
      sections: {
        strip: { type: "promo", settings: { layout: "strip" } },
        beside: { type: "promo", settings: { layout: "beside" } },
        behind: { type: "promo", settings: { layout: "behind" } },
      },
      off: "none",
    },
    bestsellers: { page: "templates.home", sections: { row: "best_sellers" }, off: "off" },
    arrivals: { page: "templates.home", sections: { row: "new_arrivals" }, off: "off" },
  },
  /*
    The category page, 2026-09-23. The shop's widest page: most people arrive on
    a category from a search or the menu rather than on the home page.

    Three of these places are settings of ONE section -- the heading's shape and
    its count are both `category_header`, and how many across, how a shopper
    reaches the rest and what an empty category says are all `product_grid`.
    That is the first time two places have shared a section, and it is why
    `settingsDecidedOn` exists: a setting one place decides must not also be
    drawn as a field in the other's dialog.

    Sorting and filtering stay drawings for now. Both are real in the API and
    neither is in the shop yet, and a place goes in here only when its section
    can do everything the place promises.
  */
  category: {
    breadcrumb: { page: "templates.category", sections: { on: "breadcrumb" }, off: "off" },
    /*
      The heading's three shapes: the plain name, the name with a small label
      above it, the name over the category's own picture. One section with a
      `layout`, like the category band and the promotion -- the merchant is
      choosing how their heading LOOKS, and two sections would let them put both
      on the page.
    */
    heading: {
      page: "templates.category",
      sections: {
        plain: { type: "category_header", settings: { layout: "plain" } },
        eyebrow: { type: "category_header", settings: { layout: "eyebrow" } },
        banner: { type: "category_header", settings: { layout: "banner" } },
      },
    },
    /*
      "24 products" under the name, which is the same section as the heading.

      **The theme's own default value comes first**, here and in every place
      below whose values are settings of one section: a document written before
      the setting existed carries none, and `slotValueFor` reads a missing
      setting as the first value that wants it. Put `on` first and a shop that
      has never touched this would read as showing a count it does not show.

      No `off` key: switching the count off is a setting, not an absent section.
      `off` there would hide the heading itself.
    */
    count: {
      page: "templates.category",
      sections: {
        off: { type: "category_header", settings: { show_count: false } },
        on: { type: "category_header", settings: { show_count: true } },
      },
    },
    grid: {
      page: "templates.category",
      sections: {
        four: { type: "product_grid", settings: { columns: "four" } },
        three: { type: "product_grid", settings: { columns: "three" } },
        two: { type: "product_grid", settings: { columns: "two" } },
      },
    },
    more: {
      page: "templates.category",
      sections: {
        pages: { type: "product_grid", settings: { more: "pages" } },
        none: { type: "product_grid", settings: { more: "none" } },
      },
    },
    text: { page: "templates.category", sections: { block: "rich_text" }, off: "off" },
    /*
      `when_empty`, not `empty`: `empty` is a reserved word in Liquid, so a
      setting named it is a path no template can write -- the product grid
      raised rather than drawing. Renamed in theming migration 0024.
    */
    empty: {
      page: "templates.category",
      sections: {
        text: { type: "product_grid", settings: { when_empty: "text" } },
        invite: { type: "product_grid", settings: { when_empty: "invite" } },
      },
    },
  },
};

/**
 * Every setting the places on one page DECIDE for themselves, for one section.
 *
 * A place whose choices are shapes of one section sets that shape by the tiles
 * at the top, so drawing the same setting again as a field below them is one
 * decision with two controls -- which is what the owner met on 2026-09-23.
 *
 * It has to be the whole page rather than the one place, because the category
 * page is the first where two places share a section: the heading's shape and
 * its count are both `category_header`. Asking only the open place would draw
 * the count as a field under the heading's tiles, and the shape as a dropdown
 * under the count's -- each place offering the other's decision.
 */
export function settingsDecidedOn(page: SlotPageKey, sectionType: string): Set<string> {
  const decided = new Set<string>();
  for (const slot of SLOTS[page] ?? []) {
    const wiring = wiringFor(ownerOf(page, slot).page, ownerOf(page, slot).key);
    if (!wiring) continue;
    for (const value of Object.keys(wiring.sections)) {
      const meaning = meaningOf(wiring, value)!;
      if (meaning.type === sectionType) {
        for (const setting of Object.keys(meaning.settings)) decided.add(setting);
      }
    }
  }
  return decided;
}

/**
 * Where a place's value actually lives.
 *
 * Most places are their own: the Home page's hero is the Home page's. Some are
 * drawn on every page and owned by one entry -- the notice strip is drawn
 * everywhere and owned by Header -- and `inheritedFrom` on the catalogue says
 * which. Everything that reads or writes a place has to ask this first, or the
 * notice a merchant clicked on Home is looked up under Home, where there is
 * nothing.
 */
export function ownerOf(page: SlotPageKey, slot: Slot): { page: SlotPageKey; key: string } {
  return slot.inheritedFrom ?? { page, key: slot.key };
}

/** What this place is in the document, or null when it is still a drawing. */
export function wiringFor(page: SlotPageKey, slotKey: string): WiredSlot | null {
  return WIRED_SLOTS[page]?.[slotKey] ?? null;
}

/** What one of this place's values means: a section type and the settings for it. */
export function meaningOf(
  wiring: WiredSlot,
  value: string,
): { type: string; settings: Record<string, unknown> } | null {
  const held = wiring.sections[value];
  if (!held) return null;
  return typeof held === "string" ? { type: held, settings: {} } : held;
}

/** The section types this place can hold, each once. */
export function sectionTypesOf(wiring: WiredSlot): string[] {
  return [
    ...new Set(
      Object.keys(wiring.sections).map((value) => meaningOf(wiring, value)!.type),
    ),
  ];
}

/** The section of one type in this place's list, or null when the document has none. */
export function sectionOfType(
  document: ThemeDocument,
  wiring: WiredSlot,
  type: string,
): ThemeSection | null {
  return pageSections(document, wiring.page).find((section) => section.type === type) ?? null;
}

/**
 * The section this place is showing, or null when it shows nothing.
 *
 * Null is a real answer, not a bug: a document written before a section existed
 * simply does not carry it, and the shop draws its theme's default instead.
 */
export function sectionFor(document: ThemeDocument, wiring: WiredSlot): ThemeSection | null {
  for (const type of sectionTypesOf(wiring)) {
    const section = sectionOfType(document, wiring, type);
    if (section && !section.hidden) return section;
  }
  return null;
}

/**
 * Which of this place's values the document is holding.
 *
 * The first section actually SHOWN wins. A place with nothing shown reads as off
 * where the place offers one, and otherwise as its first value -- a hero with no
 * pictures is still the pictures hero, waiting for one.
 */
export function slotValueFor(document: ThemeDocument, wiring: WiredSlot): string {
  for (const value of Object.keys(wiring.sections)) {
    const meaning = meaningOf(wiring, value)!;
    const section = sectionOfType(document, wiring, meaning.type);
    if (!section || section.hidden) continue;
    // Where two values are the same section shaped differently, the settings
    // are what tell them apart -- and a document written before a setting
    // existed carries none, so a missing one reads as the theme's default
    // rather than as neither value.
    const matches = Object.entries(meaning.settings).every(
      ([key, wanted]) =>
        section.settings?.[key] === wanted || section.settings?.[key] === undefined,
    );
    if (matches) return value;
  }
  return wiring.off ?? Object.keys(wiring.sections)[0];
}

/**
 * Where a place's section goes when the page does not have one yet.
 *
 * **After the last section belonging to a place ABOVE it on the canvas.**
 * The canvas order is the page order -- that is the whole idea of the slot
 * design -- so the category band goes under the hero, not below everything. It landed at
 * the end until 2026-09-22, which was the right default while a merchant could
 * drag it afterwards and is simply wrong now that nothing drags.
 *
 * A page with none of those sections yet puts it first, which is as near its own
 * place as an empty page allows.
 */
export function placeFor(
  document: ThemeDocument,
  page: SlotPageKey,
  slotKey: string,
  wiring: WiredSlot,
): number {
  const above = new Set<string>();
  for (const slot of SLOTS[page] ?? []) {
    if (slot.key === slotKey) break;
    const earlier = wiringFor(page, slot.key);
    if (earlier) for (const type of sectionTypesOf(earlier)) above.add(type);
  }

  const sections = pageSections(document, wiring.page);
  let at = 0;
  sections.forEach((section, index) => {
    if (above.has(section.type)) at = index + 1;
  });
  return at;
}

/**
 * The edits one click on a wired place makes, in order.
 *
 * Every edit starts by picking the list it belongs to. The reducer works on the
 * page it is holding -- that is what makes "remove this section" mean anything
 * -- and the canvas's own page picker is a different thing: a merchant editing
 * the notice is looking at the Home page, while the notice lives in the header
 * group. Without this, the edit went to the page on screen, found no bar there,
 * and changed nothing at all. Silently.
 *
 * Returned rather than dispatched so the editor and its tests take the same
 * path: a test that hand-writes the sequence proves the sequence it wrote.
 */
export function choiceEdits(
  document: ThemeDocument,
  wiring: WiredSlot,
  value: string,
  /** Where this place sits on the canvas, so a new section lands there. */
  where: { page: SlotPageKey; key: string },
): EditorAction[] {
  const { page, key: slotKey } = where;
  const meaning = meaningOf(wiring, value);
  const wanted = meaning?.type ?? null;
  const edits: EditorAction[] = [{ type: "pickPage", page: wiring.page }];

  // Everything this place could be, hidden unless it is the one chosen. Hidden,
  // never removed: a merchant who tries the video and comes back must still have
  // the pictures they had, and a strip switched off for a week must not cost
  // them their words.
  for (const type of sectionTypesOf(wiring)) {
    const section = sectionOfType(document, wiring, type);
    if (!section) continue;
    if (type === wanted) {
      if (section.hidden) edits.push({ type: "show", id: section.id });
    } else if (!section.hidden) {
      edits.push({ type: "hide", id: section.id });
    }
  }

  // A document written before this section existed simply does not carry it. A
  // merchant asking for the hero means the hero, not an explanation. It is born
  // with the settings that make it THIS value, rather than added and then set:
  // its id is the reducer's to mint, so nothing out here could name it anyway.
  const existing = wanted ? sectionOfType(document, wiring, wanted) : null;
  if (wanted && !existing) {
    edits.push({
      type: "add",
      sectionType: wanted,
      settings: meaning?.settings,
      at: placeFor(document, page, slotKey, wiring),
    });
  }

  // And where the section is already there, the settings that reshape it: the
  // category band becomes a row of names by its `layout`, not by a second
  // section.
  if (existing) {
    for (const [setting, next] of Object.entries(meaning?.settings ?? {})) {
      if (existing.settings?.[setting] !== next) {
        edits.push({ type: "setSetting", id: existing.id, setting, value: next });
      }
    }
  }

  return edits.length > 1 ? edits : [];
}

/** The edits one setting of the section this place is showing makes. */
export function settingEdits(
  document: ThemeDocument,
  wiring: WiredSlot,
  setting: string,
  value: unknown,
): EditorAction[] {
  const section = sectionFor(document, wiring);
  if (!section) return [];
  return [
    { type: "pickPage", page: wiring.page },
    { type: "setSetting", id: section.id, setting, value },
  ];
}

/** The edits one setting of one PART of that section makes -- a hero picture, say. */
export function blockSettingEdits(
  document: ThemeDocument,
  wiring: WiredSlot,
  blockId: string,
  setting: string,
  value: unknown,
): EditorAction[] {
  const section = sectionFor(document, wiring);
  if (!section) return [];
  return [
    { type: "pickPage", page: wiring.page },
    { type: "setSetting", id: section.id, blockId, setting, value },
  ];
}

/** Add one part to the section this place is showing: a picture, a question. */
export function addBlockEdits(
  document: ThemeDocument,
  wiring: WiredSlot,
  blockType: string,
): EditorAction[] {
  const section = sectionFor(document, wiring);
  if (!section) return [];
  return [
    { type: "pickPage", page: wiring.page },
    { type: "addBlock", id: section.id, blockType },
  ];
}

/** Take one part off. */
export function removeBlockEdits(
  document: ThemeDocument,
  wiring: WiredSlot,
  blockId: string,
): EditorAction[] {
  const section = sectionFor(document, wiring);
  if (!section) return [];
  return [
    { type: "pickPage", page: wiring.page },
    { type: "removeBlock", id: section.id, blockId },
  ];
}

/**
 * Every part of this place at once, from a list of values for one setting.
 *
 * The featured band is picked by ticking a list, not by adding eight parts and
 * filling each one in (owner, 2026-09-23). One action, so one document reaches
 * autosave rather than eight.
 */
export function setBlocksEdits(
  document: ThemeDocument,
  wiring: WiredSlot,
  blockType: string,
  setting: string,
  values: string[],
): EditorAction[] {
  const section = sectionFor(document, wiring);
  if (!section) return [];
  return [
    { type: "pickPage", page: wiring.page },
    { type: "setBlocks", id: section.id, blockType, setting, values },
  ];
}

/** Move one part up or down. Buttons, not dragging (owner, 2026-09-22). */
export function moveBlockEdits(
  document: ThemeDocument,
  wiring: WiredSlot,
  blockId: string,
  to: number,
): EditorAction[] {
  const section = sectionFor(document, wiring);
  if (!section) return [];
  return [
    { type: "pickPage", page: wiring.page },
    { type: "moveBlock", id: section.id, blockId, to },
  ];
}
