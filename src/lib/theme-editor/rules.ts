import type { ThemeBlock, ThemeManifest, ThemeSection } from "./api";

/*
 * What the editor refuses, mirroring api-paperbase engine/apps/theming/documents.py, so a
 * document the editor builds is never one the API turns down. Each check answers why an
 * edit is refused (a reason code the screen turns into text) or null when it is allowed.
 */

export const MAX_SECTIONS_PER_LIST = 40;
export const MAX_BLOCKS_PER_SECTION = 30;
export const MAX_ID_LENGTH = 40;
/** One line of copy, a paragraph, and a link: what a setting of each kind may hold. */
export const MAX_TEXT_LENGTH = 200;
export const MAX_LONG_TEXT_LENGTH = 2000;
export const MAX_URL_LENGTH = 500;

export type RuleReason =
  /** The shop needs it: the last shown copy of a required section. */
  | "required"
  /** The theme draws one shown copy per list, and one is shown already. */
  | "onlyOnce"
  | "listFull"
  | "blocksFull"
  /** Not offered here by the theme. */
  | "notAllowed";

function isShownCopy(section: ThemeSection, type: string, except?: ThemeSection): boolean {
  return section !== except && section.type === type && !section.hidden;
}

/** Why a section of `type` cannot be added to a list that allows `allowed`. It is added shown. */
export function cannotAdd(
  manifest: ThemeManifest,
  allowed: readonly string[],
  sections: readonly ThemeSection[],
  type: string,
): RuleReason | null {
  const spec = manifest.sections[type];
  if (!spec || !allowed.includes(type)) return "notAllowed";
  if (sections.length >= MAX_SECTIONS_PER_LIST) return "listFull";
  if (spec.at_most_one && sections.some((s) => isShownCopy(s, type))) return "onlyOnce";
  return null;
}

/** Hiding and removing both take a copy off the page; a hidden copy can always go. */
function cannotTakeOff(
  manifest: ThemeManifest,
  sections: readonly ThemeSection[],
  section: ThemeSection,
): RuleReason | null {
  if (section.hidden || !manifest.sections[section.type]?.required) return null;
  return sections.some((s) => isShownCopy(s, section.type, section)) ? null : "required";
}

export function cannotHide(
  manifest: ThemeManifest,
  sections: readonly ThemeSection[],
  section: ThemeSection,
): RuleReason | null {
  return section.hidden ? null : cannotTakeOff(manifest, sections, section);
}

export function cannotRemove(
  manifest: ThemeManifest,
  sections: readonly ThemeSection[],
  section: ThemeSection,
): RuleReason | null {
  return cannotTakeOff(manifest, sections, section);
}

export function cannotShow(
  manifest: ThemeManifest,
  sections: readonly ThemeSection[],
  section: ThemeSection,
): RuleReason | null {
  if (!section.hidden || !manifest.sections[section.type]?.at_most_one) return null;
  return sections.some((s) => isShownCopy(s, section.type, section)) ? "onlyOnce" : null;
}

/** Why a block of `blockType` cannot be added to `section`. */
export function cannotAddBlock(
  manifest: ThemeManifest,
  section: ThemeSection,
  blockType: string,
): RuleReason | null {
  if (!manifest.sections[section.type]?.blocks?.[blockType]) return "notAllowed";
  return section.blocks.length >= MAX_BLOCKS_PER_SECTION ? "blocksFull" : null;
}

/**
 * Why a block cannot be taken out of its section: every copy of a section keeps the blocks
 * its theme marks required (the product's title, price, variant picker and buy buttons), so
 * a merchant cannot switch off buying. Blocks are never hidden, only removed, so the last
 * copy of a required one is the one that is held.
 */
export function cannotRemoveBlock(
  manifest: ThemeManifest,
  section: ThemeSection,
  block: ThemeBlock,
): RuleReason | null {
  const required = manifest.sections[section.type]?.required_blocks ?? [];
  if (!required.includes(block.type)) return null;
  return section.blocks.some((b) => b !== block && b.type === block.type) ? null : "required";
}
