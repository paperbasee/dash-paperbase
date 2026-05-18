import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<string, string> = {
  confirmed:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  pending:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  payment_pending:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  cancelled: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export function orderStatusBadgeClass(status: string): string {
  return cn(
    "inline-flex rounded-ui border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
    STATUS_BADGE[status.toLowerCase()] ??
      "border-border bg-muted/50 text-muted-foreground"
  );
}
