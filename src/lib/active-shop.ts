/**
 * The shop this dashboard works in. Accounts' passes carry no shop (guidelines/accounts-plan.md,
 * section 7), so the dashboard names it on every request (`X-Store-Public-ID`) and on the live
 * socket (`?store=`); the API uses it if the person belongs to it, and an owner always works in
 * their own shop whatever is named.
 *
 * The choice is kept in this browser per person, so a tab opened later, or after the browser was
 * closed, starts in the same shop. `/auth/me/` says which shop to start in, and describes the shop
 * named when it is the person's (`active_store_public_id`): its answer is followed every time, so a
 * member taken off a shop moves to the one they still have.
 */

const KEY = "paperbase_active_shop";

interface Kept {
  person: string;
  shop: string;
}

function read(): Kept | null {
  try {
    const kept = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Kept> | null;
    if (typeof kept?.person === "string" && typeof kept.shop === "string" && kept.shop) {
      return { person: kept.person, shop: kept.shop };
    }
  } catch {
    // A broken value is no choice.
  }
  return null;
}

/** The shop `person` works in here, or null when none is chosen yet. */
export function activeShop(person: string | null | undefined): string | null {
  if (!person) return null;
  const kept = read();
  return kept?.person === person ? kept.shop : null;
}

/** Work in `shop` from now on (an invite just accepted, /auth/me/'s answer). */
export function chooseShop(person: string, shop: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ person, shop } satisfies Kept));
  } catch {
    // Without storage the choice lasts as long as /auth/me/ says it.
  }
}

/** Follow /auth/me/'s shop; true when the shop changed (what was shown is another shop's). */
export function followShopFromMe(person: string, shopFromMe: string | null | undefined): boolean {
  const shop = typeof shopFromMe === "string" ? shopFromMe.trim() : "";
  if (!shop) return false;
  const before = activeShop(person);
  if (before === shop) return false;
  chooseShop(person, shop);
  return before !== null;
}

/** Signing out: the next person in this browser starts in their own shop. */
export function forgetActiveShop(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing kept.
  }
}
