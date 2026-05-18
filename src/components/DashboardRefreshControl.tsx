"use client";

import {
  useDashboardRefresh,
  type RefreshInterval,
} from "@/context/DashboardRefreshContext";
import { FilterDropdown } from "@/components/filters/FilterDropdown";
import { cn } from "@/lib/utils";

const INTERVAL_OPTIONS: { value: RefreshInterval; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "30m", label: "30m" },
];

function isRefreshInterval(value: string): value is RefreshInterval {
  return INTERVAL_OPTIONS.some((o) => o.value === value);
}

interface DashboardRefreshControlProps {
  /** Match dashboard top-bar date controls (`h-9`). */
  compact?: boolean;
  className?: string;
}

export default function DashboardRefreshControl({
  compact = false,
  className,
}: DashboardRefreshControlProps) {
  const { interval, setInterval, isRefreshing, refresh } = useDashboardRefresh();

  return (
    <div
      className={cn(
        "flex w-full items-stretch overflow-hidden rounded-ui border border-border bg-input-surface text-xs text-muted-foreground shadow-xs sm:inline-flex sm:w-auto",
        compact ? "h-9" : "h-10",
        className
      )}
      role="group"
      aria-label="Dashboard refresh controls"
    >
      <button
        type="button"
        onClick={() => void refresh()}
        disabled={isRefreshing}
        className={cn(
          "inline-flex min-w-0 flex-1 items-center justify-center px-3 font-medium text-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-50 sm:flex-initial",
          compact ? "h-9" : "h-10"
        )}
        aria-label="Refresh dashboard data"
      >
        Refresh
      </button>

      <div className="w-px self-stretch bg-border" aria-hidden />

      <FilterDropdown
        value={interval}
        onChange={(value) => {
          if (isRefreshInterval(value)) setInterval(value);
        }}
        placeholder="Auto"
        options={INTERVAL_OPTIONS}
        showEmptyOption={false}
        inputAriaLabel="Auto-refresh interval"
        className={cn(
          "w-[4.5rem] shrink-0 border-0 bg-transparent shadow-none [box-shadow:none]",
          compact ? "h-9" : "h-10"
        )}
      />
    </div>
  );
}
