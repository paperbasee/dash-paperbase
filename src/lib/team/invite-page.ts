/**
 * The page an invited person opens (app/[locale]/(auth)/team/invite): what the API says of the
 * invite (POST team/invites/preview/), and which screen that is.
 *
 * The API answers for every invite its token names -- pending, ended, cancelled or used -- and,
 * when someone is signed in, whether that account can take it (`viewer.refusal`, "" when it can).
 * So each situation gets its own screen before anyone presses a button (owner, 2026-10-02).
 */

export type InviteStatus = "pending" | "expired" | "revoked" | "accepted";

/** Why the signed-in account can't take the invite (rbac.invites.why_refused); "" when it can. */
export type InviteRefusal = "" | "already_member" | "email_mismatch" | "unverified" | "owns_store";

export interface InvitePreview {
  status: InviteStatus;
  store: { name: string; logo_url: string | null };
  role: { name: string; description: string };
  inviter: { name: string; avatar_seed: string } | null;
  email_masked: string;
  expires_at: string;
  viewer: { email: string; refusal: InviteRefusal } | null;
}

/** The screens that follow from the invite alone; the page adds its own steps (name, joined). */
export type InviteScreen =
  | "join"
  | "accept"
  | "someone_else"
  | "unverified"
  | "owns_store"
  | "already_member"
  | "ended"
  | "cancelled"
  | "used";

const STATUSES: readonly InviteStatus[] = ["pending", "expired", "revoked", "accepted"];
const REFUSALS: readonly InviteRefusal[] = ["", "already_member", "email_mismatch", "unverified", "owns_store"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const text = (value: unknown): string => (typeof value === "string" ? value : "");

/** The API's answer, read carefully: anything not as expected is null, never a half-read page. */
export function parseInvitePreview(raw: unknown): InvitePreview | null {
  if (!isRecord(raw) || !isRecord(raw.store) || !isRecord(raw.role)) return null;
  const status = STATUSES.find((s) => s === raw.status);
  if (!status || !text(raw.store.name)) return null;
  let viewer: InvitePreview["viewer"] = null;
  const seen = raw.viewer;
  if (isRecord(seen)) {
    const refusal = REFUSALS.find((r) => r === seen.refusal);
    if (refusal === undefined) return null;
    viewer = { email: text(seen.email), refusal };
  }
  const inviter =
    isRecord(raw.inviter) && text(raw.inviter.name)
      ? { name: text(raw.inviter.name), avatar_seed: text(raw.inviter.avatar_seed) }
      : null;
  return {
    status,
    store: { name: text(raw.store.name), logo_url: text(raw.store.logo_url) || null },
    role: { name: text(raw.role.name), description: text(raw.role.description) },
    inviter,
    email_masked: text(raw.email_masked),
    expires_at: text(raw.expires_at),
    viewer,
  };
}

/**
 * Which screen an invite gets. Someone already on the team has nothing left to do, whatever became
 * of the invite; otherwise an invite that is over says how, and a pending one depends on who is
 * looking at it.
 */
export function inviteScreen(preview: InvitePreview): InviteScreen {
  const refusal = preview.viewer?.refusal;
  if (refusal === "already_member") return "already_member";
  if (preview.status === "expired") return "ended";
  if (preview.status === "revoked") return "cancelled";
  if (preview.status === "accepted") return "used";
  if (!preview.viewer) return "join";
  if (refusal === "email_mismatch") return "someone_else";
  if (refusal === "owns_store") return "owns_store";
  if (refusal === "unverified") return "unverified";
  return "accept";
}

/** "8 October" / "৮ অক্টোবর": the day, in Bangladesh, in the page's language. */
export function inviteDay(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Dhaka",
  }).format(date);
}
