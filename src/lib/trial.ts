import api from "@/lib/api";

/**
 * A new shop's free trial, in days (GET billing/trial/, public): what the sign-up page promises.
 * 0 when the API would grant none, so nothing is promised.
 */
export async function fetchTrialDays(): Promise<number> {
  const { data } = await api.get<{ trial_days?: unknown }>("billing/trial/");
  return typeof data.trial_days === "number" && data.trial_days > 0 ? data.trial_days : 0;
}
