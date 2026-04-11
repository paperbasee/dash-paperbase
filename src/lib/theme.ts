export type ThemePreference = "light" | "dark" | "system";
export type AppliedTheme = "light" | "dark";

export const CORE_THEME_STORAGE_KEY = "core-theme";
export const CORE_THEME_COOKIE_KEY = "core-theme";
export const CORE_THEME_APPLIED_COOKIE_KEY = "core-theme-applied";

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function getStoredThemePreference(): ThemePreference | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(CORE_THEME_STORAGE_KEY);
  return isThemePreference(stored) ? stored : null;
}

export function getSystemAppliedTheme(): AppliedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveAppliedTheme(pref: ThemePreference): AppliedTheme {
  return pref === "system" ? getSystemAppliedTheme() : pref;
}

export function applyThemePreference(pref: ThemePreference): AppliedTheme {
  if (typeof window === "undefined") return "light";
  const applied = resolveAppliedTheme(pref);
  const root = document.documentElement;
  root.classList.toggle("dark", applied === "dark");
  root.setAttribute("data-theme", applied);
  document.cookie = `${CORE_THEME_APPLIED_COOKIE_KEY}=${applied}; path=/; max-age=31536000; samesite=lax`;
  return applied;
}

export function persistThemePreference(pref: ThemePreference) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CORE_THEME_STORAGE_KEY, pref);
  document.cookie = `${CORE_THEME_COOKIE_KEY}=${pref}; path=/; max-age=31536000; samesite=lax`;
}

export function subscribeToSystemThemeChanges(onChange: (applied: AppliedTheme) => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => onChange(mq.matches ? "dark" : "light");
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }
  // Safari < 14
  mq.addListener(handler);
  return () => mq.removeListener(handler);
}

