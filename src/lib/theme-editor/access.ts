import type { ThemeAccess } from "./api";

/** The full-screen theme editor (editor step 3). */
export const THEME_EDITOR_HREF = "/settings/customize";

/** Settings > Customization, where the editor opens from and returns to. */
export const CUSTOMIZATION_HREF = "/settings?tab=customization";

/**
 * Why the shop cannot customise now; each has its own notice.
 *
 * The PLAN is not one of these any more. Since 2026-09-18 a shop on any plan may
 * edit Basic, and the plan only decides which themes it may put live — that is
 * `available` on each theme in the library, not a lock on the page.
 */
export type ThemeLock = "payment_pending" | "expired";

export type ThemePageState = {
  lock: ThemeLock | null;
  /** Theme actions may be offered: the shop is unlocked and this member may edit. */
  canEdit: boolean;
  /** Unlocked, but this member's role only views themes. */
  readOnly: boolean;
};

export function themePageState(access: ThemeAccess): ThemePageState {
  // Anything but "ok" locks, so a state added later never opens editing by accident.
  const lock: ThemeLock | null =
    access.state === "ok" ? null : access.reason === "payment_pending" ? "payment_pending" : "expired";
  return {
    lock,
    canEdit: lock === null && access.can_edit === true,
    readOnly: lock === null && access.can_edit !== true,
  };
}
