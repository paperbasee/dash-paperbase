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
/** An ISO-8601 instant with an offset; what is stored is the 20-character `...Z` form. */
export const MAX_DATETIME_LENGTH = 40;
/** The most categories a `category_ticks` setting names: the cards that follow their photo. */
export const MAX_CATEGORY_TICKS = 500;

export type RuleReason =
  /** The shop needs it: the last shown copy of a required section. */
  | "required"
  /** The theme draws one shown copy per list, and one is shown already. */
  | "onlyOnce"
  | "listFull"
  | "blocksFull"
  /** Not offered here by the theme. */
  | "notAllowed"
  /** The theme sells this one, and this shop's plan does not include it. */
  | "premium";

function isShownCopy(section: ThemeSection, type: string, except?: ThemeSection): boolean {
  return section !== except && section.type === type && !section.hidden;
}

/** Why a section of `type` cannot be added to a list that allows `allowed`. It is added shown. */
export function cannotAdd(
  manifest: ThemeManifest,
  allowed: readonly string[],
  sections: readonly ThemeSection[],
  type: string,
  /**
   * Whether this shop may serve the theme's premium sections. Defaults to true
   * so an older API build, which sends no answer, locks nobody out of anything
   * — the storefront is what actually withholds a premium band, and it asks
   * the plan itself.
   */
  premiumSections = true,
): RuleReason | null {
  const spec = manifest.sections[type];
  if (!spec || !allowed.includes(type)) return "notAllowed";
  if (spec.premium && !premiumSections) return "premium";
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

/**
 * How many parts `section` may hold: the theme's own `max_blocks` where it
 * sets one -- the hero's five pictures, the top bar's three messages -- never
 * more than the platform's cap. The API refuses a document over either, so a
 * part the editor let in past the theme's number was one it could never save.
 */
export function blockLimit(manifest: ThemeManifest, section: ThemeSection): number {
  const most = manifest.sections[section.type]?.max_blocks;
  return typeof most === "number" ? Math.min(most, MAX_BLOCKS_PER_SECTION) : MAX_BLOCKS_PER_SECTION;
}

/** Why a block of `blockType` cannot be added to `section`. */
export function cannotAddBlock(
  manifest: ThemeManifest,
  section: ThemeSection,
  blockType: string,
): RuleReason | null {
  if (!manifest.sections[section.type]?.blocks?.[blockType]) return "notAllowed";
  return section.blocks.length >= blockLimit(manifest, section) ? "blocksFull" : null;
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
