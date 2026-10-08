/**
 * Signing out, and leaving for the sign-in page. Signing in is Accounts' (lib/accounts): the
 * dashboard holds only the pass, in memory, and asks Accounts for a fresh one (lib/accounts/pass).
 */

import { clearMeProfileCache } from "@/lib/me-profile-store";
import { clearAllUnsentCopies } from "@/lib/theme-editor/unsent-copy";
import { clearAuthSessionCookie } from "@/lib/auth-session-cookie";
import { accountsUrl } from "@/lib/accounts/config";
import { dropPass } from "@/lib/accounts/pass";
import { forgetActiveShop } from "@/lib/active-shop";

/** The tabs of this browser tell each other a sign-out on it. */
export const SIGN_IN_CHANNEL = "paperbase-sign-in";
/** This tab, so it does not act on its own message. */
export const THIS_TAB = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random());
const SIGN_OUT_TIMEOUT_MS = 8_000;

let signingOut = false;

/**
 * Whether this tab is ending its sign-in itself (Sign out, End session). The sign-in's end then
 * comes back to it from the API ("session.ended") and from a renewal; the tab is already leaving,
 * for where it chose, and must not be sent to the sign-in page instead.
 */
export function isSigningOut(): boolean {
  return signingOut;
}

/** What this browser keeps of the account signed in: its data, profile and theme edits. */
function forgetSignedInData() {
  if (typeof window !== "undefined") {
    void (async () => {
      const { queryClient } = await import("@/components/QueryProvider");
      const { idbPersister } = await import("@/lib/queryPersister");
      queryClient.clear();
      await idbPersister.removeClient();
    })();
  }
  clearMeProfileCache();
  // Theme edits kept on this device belong to the member signing out.
  clearAllUnsentCopies(localStorage);
}

/** Everything this browser holds for the sign-in: its data, the pass, the shop and the hint. */
function forgetThisSignIn() {
  forgetSignedInData();
  dropPass();
  forgetActiveShop();
  clearAuthSessionCookie();
}

/**
 * Leave for the sign-in page -- or `to`, a page that carries on signed out, such as the team
 * invite -- forgetting this tab's sign-in. Accounts is not told: the sign-in is already over (it
 * ended elsewhere, or another tab signed out), or it is not this tab's to end.
 */
export function logout(to = "/login") {
  window.location.replace(to);
  forgetThisSignIn();
}

/**
 * Ask Accounts to end this browser's sign-in, and tell the other tabs. Accounts away, the browser
 * forgets the sign-in anyway; its cookie runs out by itself.
 */
async function endSignInAtAccounts(): Promise<void> {
  signingOut = true;
  try {
    await fetch(`${accountsUrl()}/passes/sign-out`, {
      method: "POST",
      credentials: "include",
      signal: AbortSignal.timeout(SIGN_OUT_TIMEOUT_MS),
    });
  } catch {
    // Unreachable: nothing more this page can do.
  }
  try {
    const channel = new BroadcastChannel(SIGN_IN_CHANNEL);
    channel.postMessage({ kind: "signed_out", from: THIS_TAB });
    channel.close();
  } catch {
    // An older browser: the other tabs find out at their next request.
  }
}

/**
 * The person pressed Sign out: Accounts ends this browser's sign-in -- its cookie stops working,
 * and the API is told -- then the browser forgets it. Waits for Accounts before leaving: the
 * sign-in page would otherwise find the sign-in still on and sign them straight back in.
 */
export async function signOut(to = "/login") {
  await endSignInAtAccounts();
  logout(to);
}

/**
 * Paperbase support pressed End session, or its time ran out: the support sign-in ends at Accounts
 * (which tells the API, which ends the visit and writes the merchant's Activities line), and the
 * browser goes to Accounts' "Support session ended" page.
 */
export async function endSupportVisit() {
  await endSignInAtAccounts();
  logout(`${accountsUrl()}/support/ended`);
}
