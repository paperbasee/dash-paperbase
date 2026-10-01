import type { MeForRouting } from "@/lib/subscription-access";

/**
 * The name the home page greets with: the signed-in person's own first name (owner, 2026-10-02 --
 * a team member was greeted with the shop owner's name). Empty when they have none, and the
 * greeting is said without a name rather than with someone else's.
 */
export function greetingName(me: Pick<MeForRouting, "first_name" | "full_name"> | null | undefined): string {
  const first = me?.first_name?.trim();
  if (first) return first;
  return me?.full_name?.trim().split(/\s+/)[0] ?? "";
}

/** How long ago the home page's numbers were fetched, as the words' parts: null when never. */
export function updatedAgo(
  lastRefreshedAt: Date | null,
  now: number
): { unit: "now" } | { unit: "minutes" | "hours"; count: number } | null {
  if (!lastRefreshedAt) return null;
  const seconds = Math.floor((now - lastRefreshedAt.getTime()) / 1000);
  if (seconds < 30) return { unit: "now" };
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return { unit: "minutes", count: minutes };
  return { unit: "hours", count: Math.floor(minutes / 60) };
}
