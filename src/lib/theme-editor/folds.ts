/**
 * Settings that fold under one line of a place's panel (2026-09-26).
 *
 * The panel shows a place's everyday settings open and folds the rest away,
 * a tap from the setting they belong to -- "Edit the words on the picture"
 * under the picture, not three more fields a merchant has to read past every
 * time they open the place. Named here, once, by setting: every section or part
 * that holds the setting `after` and any of `fields` folds them the same way,
 * so the four product rows, each department and the departments' top picture
 * all behave alike without being listed one by one.
 */
export type Fold = {
  key: string;
  /** Message key (themeEditor.kit) of the line that opens it. */
  label: string;
  /** The setting it folds under: drawn open, with the fold right after it. */
  after: string;
  /** The settings folded away. */
  fields: readonly string[];
  /** Words the setting `after` draws on itself, read from these settings. */
  words?: { heading: string; line: string; button: string };
};

export const FOLDS: readonly Fold[] = [
  {
    key: "pictureWords",
    label: "foldPictureWords",
    after: "picture",
    fields: ["picture_heading", "picture_text", "picture_button", "picture_link"],
    words: { heading: "picture_heading", line: "picture_text", button: "picture_button" },
  },
];

/**
 * The folds that apply to these settings: those whose `after` is among them
 * and that fold at least one of them. A section with a picture and no words to
 * go with it folds nothing.
 */
export function foldsFor(ids: readonly string[]): Fold[] {
  return FOLDS.filter((fold) => ids.includes(fold.after) && fold.fields.some((field) => ids.includes(field)));
}
