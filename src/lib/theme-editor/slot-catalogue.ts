/**
 * The slots each page offers, and what may go in each one.
 *
 * **This is design data, not the API's.** The owner decided on 2026-09-20 that a
 * merchant arranges nothing: every page has the same places in the same order,
 * and the only choice is what fills each place. This file is the shape of that
 * idea, written down so the screen can be built and looked at before any of it
 * is wired to a theme document.
 *
 * When it IS wired, every field below comes from the theme manifest the API
 * already serves (`sections`, `settings`, `option_labels`) and this file goes
 * away. Nothing here should grow logic: it is a list to render, and the moment
 * it needs a rule it belongs in `document-ops` with the rest.
 *
 * Copy lives in `messages/{en,bn}.json` under `themeEditor.slots`, like the rest
 * of the editor -- a key missing in either language renders as the raw key, and
 * most merchants read the Bangla one.
 */

/** Which page a merchant is looking at. Matches the editor's existing page keys. */
export type SlotPageKey = "home" | "product" | "checkout" | "header" | "footer";

/** The wireframe drawn on an option's tile, so a merchant sees the shape before choosing. */
export type OptionShape = "blank" | "line" | "block" | "row";

export type SlotOption = {
  /** Stored value. Matches the section setting this will become. */
  value: string;
  /** `themeEditor.slots.*` key for the name. */
  label: string;
  /** Optional `themeEditor.slots.*` key for the line under the name. */
  note?: string;
  shape: OptionShape;
  /** Shown with its badge before a merchant pays for it. */
  premium?: boolean;
};

export type Slot = {
  key: string;
  /** `themeEditor.slots.*` key for the tab that names this place. */
  label: string;
  /**
   * Drawn on every page and edited once, so this page shows it but does not
   * offer it. The tab says which.
   */
  inherited?: boolean;
  /**
   * Its shape is the platform's, not a merchant's: the buying column and the
   * checkout form are where people pay. Clicking still answers -- with the
   * reason, rather than doing nothing.
   */
  locked?: boolean;
  /** `themeEditor.slots.*` key for that reason. */
  lockedBecause?: string;
  /** What a merchant may put here. Empty when locked or inherited. */
  options?: SlotOption[];
  /** The value that is in the slot to begin with. */
  initial?: string;
  /** Values that mean "nothing here": the slot draws its empty state instead. */
  emptyValues?: string[];
  /** `themeEditor.slots.*` key for what the empty state says. */
  emptyLabel?: string;
};

export const SLOT_PAGES: readonly SlotPageKey[] = ["home", "product", "checkout"] as const;
export const SLOT_GROUPS: readonly SlotPageKey[] = ["header", "footer"] as const;

export const SLOTS: Record<SlotPageKey, Slot[]> = {
  home: [
    { key: "header", label: "header", inherited: true },
    {
      key: "notice",
      label: "notice",
      initial: "off",
      emptyValues: ["off"],
      emptyLabel: "noticeEmpty",
      options: [
        { value: "off", label: "off", shape: "blank" },
        { value: "message", label: "noticeMessage", note: "noticeMessageNote", shape: "line" },
      ],
    },
    {
      key: "hero",
      label: "hero",
      initial: "slider",
      options: [
        { value: "slider", label: "heroSlider", note: "heroSliderNote", shape: "block" },
        { value: "still", label: "heroStill", note: "heroStillNote", shape: "block" },
        { value: "video", label: "heroVideo", note: "heroVideoNote", shape: "block", premium: true },
      ],
    },
    { key: "bands", label: "bands", locked: true, lockedBecause: "bandsWhy" },
    {
      key: "promo",
      label: "promo",
      initial: "none",
      emptyValues: ["none"],
      emptyLabel: "promoEmpty",
      options: [
        { value: "none", label: "nothing", shape: "blank" },
        { value: "text", label: "promoText", shape: "line" },
        { value: "countdown", label: "promoCountdown", note: "promoCountdownNote", shape: "line", premium: true },
        { value: "card", label: "promoCard", note: "promoCardNote", shape: "block", premium: true },
      ],
    },
    {
      key: "story",
      label: "story",
      initial: "none",
      emptyValues: ["none"],
      emptyLabel: "storyEmpty",
      options: [
        { value: "none", label: "nothing", shape: "blank" },
        { value: "text", label: "storyText", note: "storyTextNote", shape: "line" },
        { value: "both", label: "storyBoth", note: "storyBothNote", shape: "row" },
      ],
    },
    { key: "footer", label: "footer", inherited: true },
  ],

  product: [
    { key: "header", label: "header", inherited: true },
    { key: "buy", label: "buy", locked: true, lockedBecause: "buyWhy" },
    {
      key: "trust",
      label: "trust",
      initial: "on",
      emptyValues: ["off"],
      emptyLabel: "trustEmpty",
      options: [
        { value: "on", label: "on", note: "trustNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "description",
      label: "description",
      initial: "box",
      options: [
        { value: "box", label: "descriptionBox", note: "descriptionBoxNote", shape: "block" },
        { value: "plain", label: "descriptionPlain", note: "descriptionPlainNote", shape: "line" },
      ],
    },
    {
      key: "specs",
      label: "specs",
      initial: "grid",
      options: [
        { value: "grid", label: "specsGrid", note: "specsGridNote", shape: "row" },
        { value: "folded", label: "specsFolded", note: "specsFoldedNote", shape: "line" },
      ],
    },
    {
      key: "related",
      label: "related",
      initial: "on",
      emptyValues: ["off"],
      emptyLabel: "relatedEmpty",
      options: [
        { value: "on", label: "on", note: "relatedNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    { key: "footer", label: "footer", inherited: true },
  ],

  checkout: [
    { key: "header", label: "header", inherited: true },
    {
      key: "trust",
      label: "trustLine",
      initial: "on",
      emptyValues: ["off"],
      emptyLabel: "trustEmpty",
      options: [
        { value: "on", label: "on", note: "trustLineNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    { key: "form", label: "form", locked: true, lockedBecause: "formWhy" },
    { key: "summary", label: "summary", locked: true, lockedBecause: "summaryWhy" },
    {
      key: "after",
      label: "after",
      initial: "none",
      emptyValues: ["none"],
      emptyLabel: "afterEmpty",
      options: [
        { value: "none", label: "nothing", shape: "blank" },
        { value: "line", label: "afterLine", note: "afterLineNote", shape: "line" },
      ],
    },
    { key: "footer", label: "footer", inherited: true },
  ],

  header: [
    {
      key: "layout",
      label: "headerLayout",
      initial: "bar",
      options: [
        { value: "bar", label: "headerBar", note: "headerBarNote", shape: "line" },
        { value: "masthead", label: "headerMasthead", note: "headerMastheadNote", shape: "block" },
      ],
    },
    {
      key: "sticky",
      label: "sticky",
      initial: "on",
      options: [
        { value: "on", label: "on", note: "stickyNote", shape: "line" },
        { value: "off", label: "off", note: "stickyOffNote", shape: "blank" },
      ],
    },
    {
      key: "marks",
      label: "marks",
      initial: "off",
      options: [
        { value: "off", label: "marksCartOnly", shape: "line" },
        { value: "on", label: "marksBoth", note: "marksBothNote", shape: "row" },
      ],
    },
  ],

  footer: [
    {
      key: "layout",
      label: "footerLayout",
      initial: "columns",
      options: [
        { value: "columns", label: "footerColumns", note: "footerColumnsNote", shape: "row" },
        { value: "split", label: "footerSplit", note: "footerSplitNote", shape: "block" },
      ],
    },
  ],
};

/** What every slot on a page starts as, so the screen opens in a real state. */
export function initialChoices(page: SlotPageKey): Record<string, string> {
  const out: Record<string, string> = {};
  for (const slot of SLOTS[page]) {
    if (slot.initial) out[slot.key] = slot.initial;
  }
  return out;
}

/** Is this slot showing nothing at all right now? */
export function isEmpty(slot: Slot, value: string | undefined): boolean {
  return Boolean(slot.emptyValues?.includes(value ?? ""));
}
