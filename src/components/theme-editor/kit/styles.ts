/*
 * The editor kit's look, in one place (owner, 2026-09-26: "we will use the
 * central design system" -- every box in the editor draws from these, and none
 * is styled by hand).
 *
 * Calm on purpose: no box inside a box, spacing and type doing the grouping,
 * soft filled fields with no border, one strong button.
 *
 * **Corners are the dashboard's own** (owner, 2026-09-26: "the border radius of
 * the cards, buttons, etc. will follow the dashboard's"): a card is
 * `rounded-card`, a button `rounded-button`, a field `rounded-input`, a sheet
 * `rounded-dialog` -- the tokens every other screen of the dashboard uses, so
 * the editor never looks like a different product. No corner here is a number.
 */

/** A field's soft ground: text, a paragraph, a number, a date. */
export const FIELD =
  "w-full min-w-0 rounded-input border-0 bg-muted/70 px-3 py-2.5 text-[13.5px] text-foreground outline-none transition-[background-color,box-shadow] duration-150 placeholder:text-muted-foreground hover:bg-muted focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:ring-2 aria-invalid:ring-destructive/40 disabled:cursor-not-allowed disabled:opacity-50";

/** The label over a field. */
export const LABEL = "block text-[12.5px] font-medium text-foreground/80";

/** The line under a field that explains it. */
export const HELP = "text-[12px] leading-relaxed text-muted-foreground";

/** A group's small caption. */
export const CAPTION = "text-[12px] font-medium text-muted-foreground";

/** The pill bar a short choice sits in, and one pill in it. */
export const PILLS = "flex w-full rounded-ui bg-muted/70 p-[3px]";
export const PILL =
  "flex-1 min-w-0 truncate rounded-button px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50";
export const PILL_ON = "bg-background text-foreground shadow-[0_0_0_0.5px_hsl(var(--border)),0_1px_2px_rgb(0_0_0/0.06)]";

/** A choice drawn as a small card, for choices with more than three answers. */
export const CARD =
  "flex min-w-0 flex-col gap-2 rounded-card bg-muted/60 p-2.5 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50";
export const CARD_ON = "bg-background shadow-[0_0_0_1.5px_hsl(var(--foreground))]";

/** A quiet text button: Replace, Change, Edit. */
export const QUIET =
  "inline-flex items-center gap-1.5 rounded-button px-2 py-1 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring";

/** A round icon button: close, move, remove. */
export const ROUND =
  "grid size-8 shrink-0 place-items-center rounded-button text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35";

/** A row that opens something: a picker, a list. */
export const ROW =
  "flex w-full min-w-0 items-center gap-2.5 rounded-card bg-muted/60 px-3 py-2.5 text-left text-[13.5px] transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring";

/** A picture's frame. */
export const PICTURE = "relative w-full overflow-hidden rounded-card bg-muted";

/** The panel's corners on a phone, where it rises from the bottom. */
export const SHEET_TOP = "rounded-t-dialog";

/** The small arrow a long list wears, drawn in the stylesheet so no icon sits on the field. */
export const SELECT_ARROW =
  "bg-[length:14px] bg-[position:right_12px_center] bg-no-repeat [background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]";

/** The strong button: Done, Use this link. One to a view. */
export const PRIMARY =
  "inline-flex h-10 items-center justify-center gap-2 rounded-button bg-foreground px-5 text-[13.5px] font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40";

/** The quiet button beside it: Remove the link, Upload. */
export const SECONDARY =
  "inline-flex h-10 items-center justify-center gap-2 rounded-button bg-muted/70 px-5 text-[13.5px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50";
