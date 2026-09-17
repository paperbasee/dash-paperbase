import type { ThemeManifest, ThemeSectionSpec, ThemeSettingSpec } from "./api";
import { localLabel } from "./document-ops";
import { MAX_LONG_TEXT_LENGTH, MAX_TEXT_LENGTH, MAX_URL_LENGTH } from "./rules";

/*
 * The fields the settings panel draws, read from the theme file and written in the
 * merchant's language.
 *
 * The theme file is the only place a field's name, help, choices and limits come from, so
 * a new theme adds a form without a line of dashboard code. Only the kinds
 * engine/apps/theming/manifest.py lists are drawn: a theme that one day ships a kind this
 * dashboard does not know (a picture, say) leaves that field out of the panel rather than
 * drawing a broken control, exactly as the storefront skips a section type it cannot draw.
 */

/** The setting kinds the API validates (engine/apps/theming/manifest.py SETTING_TYPES). */
export const FIELD_KINDS = ["text", "textarea", "boolean", "number", "select", "url"] as const;

export type FieldKind = (typeof FIELD_KINDS)[number];

export type FieldOption = { value: string; label: string };

export type FieldSpec = {
  id: string;
  kind: FieldKind;
  label: string;
  /** One line under the field, or null when the theme wrote none. */
  help: string | null;
  /** What the setting holds until the merchant changes it. */
  default: unknown;
  /** text, textarea and url: the most characters the API stores. Null for the others. */
  maxLength: number | null;
  /** number: the ends of the range the API accepts, both included. Null for the others. */
  min: number | null;
  max: number | null;
  /** select: the choices, named in the merchant's language. Empty for the others. */
  options: FieldOption[];
};

const LENGTHS: Partial<Record<FieldKind, number>> = {
  text: MAX_TEXT_LENGTH,
  textarea: MAX_LONG_TEXT_LENGTH,
  url: MAX_URL_LENGTH,
};

function isKind(type: string): type is FieldKind {
  return (FIELD_KINDS as readonly string[]).includes(type);
}

/** The theme's help line in the reader's language, falling back to English. Null when there is none. */
function localHelp(spec: ThemeSettingSpec, locale: string): string | null {
  const bangla = locale === "bn" ? spec.help_bn?.trim() : "";
  return bangla || spec.help?.trim() || null;
}

function optionLabel(spec: ThemeSettingSpec, option: string, locale: string): string {
  const labels = spec.option_labels?.[option];
  const bangla = locale === "bn" ? labels?.bn?.trim() : "";
  return bangla || labels?.en?.trim() || option;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** The fields for one list of settings, in the theme's order. */
export function fieldSpecs(
  specs: readonly ThemeSettingSpec[] | undefined,
  locale: string,
): FieldSpec[] {
  const out: FieldSpec[] = [];
  for (const spec of specs ?? []) {
    if (!isKind(spec.type)) continue;
    out.push({
      id: spec.id,
      kind: spec.type,
      label: localLabel(spec, locale),
      help: localHelp(spec, locale),
      default: spec.default,
      maxLength: LENGTHS[spec.type] ?? null,
      min: spec.type === "number" ? number(spec.min) : null,
      max: spec.type === "number" ? number(spec.max) : null,
      options:
        spec.type === "select"
          ? (spec.options ?? []).map((option) => ({
              value: option,
              label: optionLabel(spec, option, locale),
            }))
          : [],
    });
  }
  return out;
}

/** The fields of a section of `type`; empty for a section the theme gives none (and for an unknown one). */
export function sectionFields(manifest: ThemeManifest, type: string, locale: string): FieldSpec[] {
  return fieldSpecs(manifest.sections[type]?.settings, locale);
}

/** The fields of one of a section's blocks. */
export function blockFields(
  manifest: ThemeManifest,
  sectionType: string,
  blockType: string,
  locale: string,
): FieldSpec[] {
  return fieldSpecs(manifest.sections[sectionType]?.blocks?.[blockType]?.settings, locale);
}

/**
 * What a field holds now: the stored value, or the theme's default when the setting was never
 * written. The API fills every omitted setting from the same default, so the panel and the
 * stored document agree about what an untouched field shows.
 */
export function fieldValue(spec: FieldSpec, settings: Record<string, unknown> | undefined): unknown {
  const value = settings?.[spec.id];
  return value === undefined ? spec.default : value;
}

/** The blocks a section may hold, in the theme's order, named in the merchant's language. */
export function blockChoices(
  spec: ThemeSectionSpec | undefined,
  locale: string,
): { type: string; label: string }[] {
  return Object.entries(spec?.blocks ?? {}).map(([type, block]) => ({
    type,
    label: localLabel(block, locale),
  }));
}
