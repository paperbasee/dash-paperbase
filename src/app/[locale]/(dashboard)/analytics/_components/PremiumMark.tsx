import { Crown } from "lucide-react";

/** The crown a locked section's tab carries on the Essential plan (PremiumShowcase.tsx). */
export function PremiumMark({ label }: { label: string }) {
  return <Crown className="size-3.5 text-amber-500 dark:text-amber-300" aria-label={label} role="img" />;
}
