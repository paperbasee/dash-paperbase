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
