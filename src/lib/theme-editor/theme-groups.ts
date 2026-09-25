import type { ThemeSummary } from "./api";

export const BASIC_THEME_KEY = "basic";

function normalizeCategory(category: string | null): string | null {
  const word = (category ?? "").trim().toLowerCase();
  return word || null;
}

/** A theme's name in the viewer's language, falling back to English. */
export function themeName(theme: Pick<ThemeSummary, "name" | "name_bn">, locale: string): string {
  return locale === "bn" && theme.name_bn.trim() ? theme.name_bn : theme.name;
}

/**
 * The name for a theme key. A key the list no longer carries (a retired theme a store still
 * holds) has no name to show, so the caller's own translated words stand in — never the key,
 * which is English and would land inside a Bangla sentence.
 */
export function themeNameByKey(
  themes: readonly ThemeSummary[],
  key: string | null,
  locale: string,
  unnamed: string,
): string {
  const theme = themes.find((t) => t.key === key);
  if (theme) return themeName(theme, locale);
  return key ? unnamed : "";
}

/** Message keys (settings.customization) for the categories the owner named. */
export const CATEGORY_MESSAGE_KEYS = {
  fashion: "categoryFashion",
  electronics: "categoryElectronics",
  toys: "categoryToys",
} as const;

export type CategoryMessageKey =
  | (typeof CATEGORY_MESSAGE_KEYS)[keyof typeof CATEGORY_MESSAGE_KEYS]
  | "categoryOther";

/** A known category's message key, or the word itself, capitalised, for a new one. */
export function categoryLabel(
  category: string | null,
): { key: CategoryMessageKey } | { text: string } {
  const word = normalizeCategory(category);
  if (word === null) return { key: "categoryOther" };
  const key = CATEGORY_MESSAGE_KEYS[word as keyof typeof CATEGORY_MESSAGE_KEYS];
  return key ? { key } : { text: word.charAt(0).toUpperCase() + word.slice(1) };
}
