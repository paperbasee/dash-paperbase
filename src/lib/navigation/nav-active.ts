import { APP_CONFIG } from "@/config/apps";

/**
 * Which sidebar row should light up for the page a merchant is on.
 *
 * **The deepest matching route wins, and only it.** Some apps live under
 * another app's route -- `/orders/abandoned` under `/orders`, `/customers/
 * accounts` under `/customers`, `/products/wished` under `/products` -- and a
 * plain prefix test lit up both rows at once. Standing on Abandoned checkouts
 * with Orders highlighted beside it says the merchant is in two places.
 *
 * A detail page still lights its list: `/orders/ORD-1234` is under `/orders`
 * and under no deeper nav route, so Orders is the deepest match and the row
 * highlights -- which is what you want while reading one order.
 *
 * The match is on whole segments (`/orders` or `/orders/...`, never
 * `/orders-archive`), and the routes come from `APP_CONFIG` rather than a list
 * written out again here, so a new page under an existing one is handled the
 * day it is added.
 */
const NAV_HREFS: readonly string[] = Object.values(APP_CONFIG)
  .map((app) => app.href)
  .filter((href): href is string => Boolean(href));

/** Is `pathname` this route or a page inside it? */
function covers(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavHrefActive(pathname: string, href: string): boolean {
  // Home matches nothing but home; every path is inside "/".
  if (href === "/") return pathname === "/";
  if (!covers(pathname, href)) return false;
  return !NAV_HREFS.some((other) => other.length > href.length && covers(pathname, other));
}
