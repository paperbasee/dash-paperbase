/**
 * Which permission a dashboard address needs, so a member who types the address of a page their
 * role doesn't include meets one plain screen (components/navigation/PageAccessGate.tsx) instead
 * of a page whose every request the API refuses (roles plan, owner 2026-10-02).
 *
 * An address belongs to the app whose page it sits under (config/apps.ts `href`, the longest
 * match), which `APP_PAGE_PERMISSION` gates. A few addresses need more than their page: adding
 * and editing. A few pages are no app but are gated all the same.
 */

import { APP_CONFIG } from "@/config/apps";
import { THEME_EDITOR_HREF } from "@/lib/theme-editor/access";

/** Addresses that add or change something: they need more than seeing their page. */
const ACTION_ROUTES: readonly (readonly [RegExp, string])[] = [
  [/^\/products\/new$/, "products.create"],
  [/^\/products\/[^/]+\/edit$/, "products.edit"],
  [/^\/orders\/new$/, "orders.edit"],
  [/^\/blog\/new$/, "blogs.manage"],
];

/** Pages that are no app (config/apps.ts) and still belong to a key. */
const KEYED_PAGES: readonly (readonly [string, string])[] = [
  ["/activities", "activity.view"],
  [THEME_EDITOR_HREF, "theming.manage"],
];

export type PageRule = {
  /** The app whose page this is, gated by its key in `APP_PAGE_PERMISSION`. */
  appId?: string;
  /** A key the address needs besides. */
  key?: string;
};

export function pageRule(pathname: string): PageRule {
  const path = pathname.replace(/\/+$/, "") || "/";
  const under = (href: string) => path === href || path.startsWith(`${href}/`);
  let appId: string | undefined;
  let longest = 0;
  for (const app of Object.values(APP_CONFIG)) {
    if (app.href && under(app.href) && app.href.length > longest) {
      appId = app.id;
      longest = app.href.length;
    }
  }
  const key =
    ACTION_ROUTES.find(([pattern]) => pattern.test(path))?.[1] ??
    KEYED_PAGES.find(([href]) => under(href))?.[1];
  return { appId, key };
}
