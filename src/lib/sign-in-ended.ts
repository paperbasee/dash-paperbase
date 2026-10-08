import type { SocketEvent } from "@/lib/websocket/socket-client";

/**
 * Why a sign-in was ended for the dashboard (Accounts' SignIn.EndReason), for the ones Accounts'
 * sign-in page explains. A member whose role, categories or place on the team changes is signed out of the shop
 * at once (owner, 2026-10-02), and the owner can end anyone's sign-in from Sessions.
 */
export const SIGN_IN_END_REASONS = ["access_changed", "access_ended", "ended", "support_ended"] as const;
export type SignInEndReason = (typeof SIGN_IN_END_REASONS)[number];

export function isSignInEndReason(value: unknown): value is SignInEndReason {
  return typeof value === "string" && (SIGN_IN_END_REASONS as readonly string[]).includes(value);
}

/**
 * Where a tab goes when its live-events socket says its sign-in ended ("session.ended"), or null
 * to stay. Only the sign-in the socket was opened with leaves: a tab that already holds a pass of
 * another sign-in is not that one's to end. The reason travels on to Accounts' sign-in page, which
 * says it (lib/accounts/sign-in, `ended`).
 */
export function pageAfterSignInEnded(
  event: SocketEvent,
  socketSid: string,
  currentSid: string | null,
): string | null {
  if (event.event !== "session.ended" || !socketSid) return null;
  if (currentSid && currentSid !== socketSid) return null;
  const reason = event.payload.reason;
  return isSignInEndReason(reason) ? `/login?ended=${reason}` : "/login";
}
