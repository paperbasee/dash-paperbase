import { Lock } from "lucide-react";

/** The lock a locked section's tab carries on the Essential plan (PremiumLock.tsx). */
export function LockMark({ label }: { label: string }) {
  return <Lock className="size-3 text-muted-foreground" aria-label={label} role="img" />;
}
