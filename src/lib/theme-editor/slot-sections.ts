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
  /** The list in the document that holds the section: a group, or `templates.<name>`. */
  page: PageKey;
  /** The manifest section type this place stands for. */
  type: string;
  /** The slot value that means the section is showing. */
  on: string;
  /** The slot value that means nothing is here. */
  off: string;
};

/** Wired places, by the page picker entry that edits them. */
export const WIRED_SLOTS: Partial<Record<SlotPageKey, Record<string, WiredSlot>>> = {
  header: {
    notice: { page: "header", type: "announcement_bar", on: "message", off: "off" },
  },
};

/**
 * Where a place's value actually lives.
 *
 * Most places are their own: the Home page's banner is the Home page's. Some are
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

/**
 * The section this place stands for, or null when the document has none.
 *
 * Null is a real answer, not a bug: a document written before a section existed
 * simply does not carry it, and the shop draws its theme's default instead.
 */
export function sectionFor(document: ThemeDocument, wiring: WiredSlot): ThemeSection | null {
  return pageSections(document, wiring.page).find((section) => section.type === wiring.type) ?? null;
}

/** On or off, as the document has it. A section that is not there reads as off. */
export function slotValueFor(document: ThemeDocument, wiring: WiredSlot): string {
  const section = sectionFor(document, wiring);
  return section && !section.hidden ? wiring.on : wiring.off;
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
  const section = sectionFor(document, wiring);
  const pick: EditorAction = { type: "pickPage", page: wiring.page };
  if (!section) {
    // A document written before this section existed simply does not carry it.
    // A merchant asking for the bar means the bar, not an explanation.
    return value === wiring.off ? [] : [pick, { type: "add", sectionType: wiring.type }];
  }
  // Hidden, never removed: a strip switched off for a week and back on again
  // must not cost the merchant their words.
  return [pick, { type: value === wiring.off ? "hide" : "show", id: section.id }];
}

/** The edits one setting of a wired place makes. */
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
