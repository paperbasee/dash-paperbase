/*
 * The theme editor's kit (2026-09-26): every settings view, pop-up and picker
 * in the editor is built from these pieces and nothing else -- see
 * `styles.ts` for why, and `tests/settings/editor-kit.test.tsx` for the rule
 * that keeps it so.
 */
export { KitGroup, KitNote, KitPanel } from "./Panel";
export { KitField, KitInput, KitSelect, KitSwitchRow, KitTextarea } from "./Field";
export { KitBadge, KitChoice, KitShape, type KitOption } from "./Choice";
export { KitPicture, type KitPictureWords } from "./Picture";
export { KitAdd, KitFold, KitPart, KitPicked, KitValueRow } from "./Rows";
