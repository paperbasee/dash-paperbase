import type { ThemeSummary } from "./api";

export const BASIC_THEME_KEY = "basic";

/** Owner decision: Fashion leads; other categories follow in the API's order. */
const LEADING_CATEGORY = "fashion";

export type ThemeGroup = {
  /** Lowercased category word; null for a theme outside every category. */
  category: string | null;
  themes: ThemeSummary[];
};

export type GroupedThemes = {
  /** The free default, shown first and outside the groups. */
  basic: ThemeSummary | null;
  groups: ThemeGroup[];
  /** A single group needs no heading. */
  showHeadings: boolean;
};

function normalizeCategory(category: string | null): string | null {
  const word = (category ?? "").trim().toLowerCase();
  return word || null;
}

function groupRank(category: string | null): number {
  if (category === LEADING_CATEGORY) return 0;
  return category === null ? 2 : 1;
}

export function groupThemes(themes: readonly ThemeSummary[]): GroupedThemes {
  const basic = themes.find((theme) => theme.key === BASIC_THEME_KEY) ?? null;
  const groups: ThemeGroup[] = [];
  for (const theme of themes) {
    if (theme.key === BASIC_THEME_KEY) continue;
    const category = normalizeCategory(theme.category);
    const group = groups.find((g) => g.category === category);
    if (group) group.themes.push(theme);
    else groups.push({ category, themes: [theme] });
  }
  // Array.prototype.sort is stable, so equal ranks keep the API's order.
  groups.sort((a, b) => groupRank(a.category) - groupRank(b.category));
  return { basic, groups, showHeadings: groups.length > 1 };
}

/** A theme's name in the viewer's language, falling back to English. */
export function themeName(theme: Pick<ThemeSummary, "name" | "name_bn">, locale: string): string {
  return locale === "bn" && theme.name_bn.trim() ? theme.name_bn : theme.name;
}

/** The name for a theme key, or the key itself when the list no longer has it. */
export function themeNameByKey(
  themes: readonly ThemeSummary[],
  key: string | null,
  locale: string,
): string {
  const theme = themes.find((t) => t.key === key);
  return theme ? themeName(theme, locale) : (key ?? "");
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
