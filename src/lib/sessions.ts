import api from "@/lib/api";

/**
 * The owner's Sessions tab (2026-09-29): every sign-in to the shop -- the owner's, their team's and
 * Paperbase support's -- as the API records them (accounts.sign_in_sessions). Owner only.
 */

export type SignInMethod = "passkey" | "email_link" | "email_code" | "support" | "earlier";

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
  end_reason: "" | "signed_out" | "ended" | "support_ended";
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

/** "Dhaka, Bangladesh", or the country alone, or nothing. */
export function placeOf(row: Pick<SignInSessionRow, "city" | "country">): string {
  return [row.city, row.country].filter(Boolean).join(", ");
}
