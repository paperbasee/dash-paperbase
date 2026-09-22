import type { ThemeDocument, ThemeSection } from "@/lib/theme-editor/api";
import { pageSections, type PageKey } from "@/lib/theme-editor/document-ops";
import type { EditorAction } from "@/lib/theme-editor/editor-reducer";
import type { Slot, SlotPageKey } from "@/lib/theme-editor/slot-catalogue";

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
   * What each of this place's values IS, as a section type.
   *
   * Usually one: the notice strip is an announcement bar or it is nothing. The
   * hero is two -- pictures or a video -- and they are different sections, so a
   * place has to be able to say "this value means that section". Choosing one
   * hides the other rather than removing it, so a merchant who tries the video
   * and goes back still has the pictures they had.
   */
  sections: Record<string, string>;
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
  },
};

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

/** The section types this place can hold. */
export function sectionTypesOf(wiring: WiredSlot): string[] {
  return Object.values(wiring.sections);
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
  for (const [value, type] of Object.entries(wiring.sections)) {
    const section = sectionOfType(document, wiring, type);
    if (section && !section.hidden) return value;
  }
  return wiring.off ?? Object.keys(wiring.sections)[0];
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
): EditorAction[] {
  const wanted = wiring.sections[value] ?? null;
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
  // merchant asking for the hero means the hero, not an explanation.
  if (wanted && !sectionOfType(document, wiring, wanted)) {
    edits.push({ type: "add", sectionType: wanted });
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
