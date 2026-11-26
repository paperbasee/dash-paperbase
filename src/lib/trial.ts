import api from "@/lib/api";
import type { MeSubscription } from "@/lib/subscription-access";

const DAY_MS = 86_400_000;

/**
 * A new shop's free trial, in days (GET billing/trial/, public): what the sign-up page promises.
 * 0 when the API would grant none, so nothing is promised.
 */
export async function fetchTrialDays(): Promise<number> {
  const { data } = await api.get<{ trial_days?: unknown }>("billing/trial/");
  return typeof data.trial_days === "number" && data.trial_days > 0 ? data.trial_days : 0;
}

export interface RunningTrial {
  /** The trial's length, from its own start and end. */
  days: number;
  endsAt: string;
}

/** The free trial running now (auth/me), with its length and end; null for any other plan, or none. */
export function runningTrial(subscription: MeSubscription, now: number = Date.now()): RunningTrial | null {
  const { subscription_status, is_trial, starts_at, ends_at } = subscription;
  if (subscription_status !== "ACTIVE" || is_trial !== true || !starts_at || !ends_at) return null;
  const ends = Date.parse(ends_at);
  if (!(ends > now)) return null;
  return { days: Math.round((ends - Date.parse(starts_at)) / DAY_MS), endsAt: ends_at };
}
