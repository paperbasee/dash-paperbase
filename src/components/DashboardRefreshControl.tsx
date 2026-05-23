"use client";

import { Loader2 } from "lucide-react";
import { useDashboardRefresh } from "@/context/DashboardRefreshContext";
import { cn } from "@/lib/utils";

interface DashboardRefreshControlProps {
  /** Match dashboard top-bar date controls (`h-9`). */
  compact?: boolean;
  className?: string;
}

export default function DashboardRefreshControl({
  compact = false,
  className,
}: DashboardRefreshControlProps) {
  const { isRefreshing, refresh } = useDashboardRefresh();

  return (
    <button
      type="button"
      onClick={() => void refresh()}
      disabled={isRefreshing}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-ui border border-border bg-input-surface px-3 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-50",
        compact ? "h-9" : "h-10",
        className
      )}
      aria-label="Refresh dashboard data"
      aria-busy={isRefreshing}
    >
      {isRefreshing && (
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
      )}
      Refresh
    </button>
  );
}
