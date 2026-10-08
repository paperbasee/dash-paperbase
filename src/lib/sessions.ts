import api from "@/lib/api";
import { isApiHttpError } from "@/lib/api-client";

/**
 * The owner's Sessions tab (2026-09-29): every sign-in to the shop -- the owner's, their team's and
 * Paperbase support's -- as Accounts keeps them, through the API, which checks it is the owner
 * asking (api accounts/session_views.py). Owner only. A 503 `accounts_unavailable`: Accounts did
 * not answer.
 */

export type SignInMethod = "passkey" | "email_link" | "email_code" | "support";

export type SignInSessionRow = {
  public_id: string;
  name: string;
  email: string;
  role: string;
  is_support: boolean;
  method: SignInMethod;
  device: string;
  device_kind: string;
  ip_address: string;
  city: string;
  country: string;
  created_at: string;
  last_seen_at: string;
  ended_at: string | null;
  end_reason: "" | "signed_out" | "ended" | "support_ended" | "access_changed" | "access_ended" | "switched_off";
  ended_by: string;
  is_live: boolean;
  is_current: boolean;
};

export type SessionHistoryPage = { count: number; page: number; pages: number; results: SignInSessionRow[] };

export async function fetchActiveSessions(): Promise<SignInSessionRow[]> {
  const { data } = await api.get<{ active: SignInSessionRow[] }>("auth/sessions/");
  return data.active;
}

export async function fetchSessionHistory(page: number): Promise<SessionHistoryPage> {
  const { data } = await api.get<SessionHistoryPage>("auth/sessions/history/", { params: { page } });
  return data;
}

export async function endSession(publicId: string): Promise<void> {
  await api.post(`auth/sessions/${publicId}/end/`);
}

export async function endOtherSessions(): Promise<number> {
  const { data } = await api.post<{ ended: number }>("auth/sessions/end-others/");
  return data.ended;
}

/** Accounts did not answer the API (503 `accounts_unavailable`), rather than any other failure. */
export function accountsAway(error: unknown): boolean {
  return isApiHttpError(error) && error.status === 503;
}

/** "Dhaka, Bangladesh", or the country alone, or nothing. */
export function placeOf(row: Pick<SignInSessionRow, "city" | "country">): string {
  return [row.city, row.country].filter(Boolean).join(", ");
}
