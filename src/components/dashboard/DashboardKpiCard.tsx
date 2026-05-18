import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrendDirection } from "@/lib/dashboard/compute-trend";

type Accent = "blue" | "green" | "yellow" | "red";

const ACCENT_VALUE: Record<Accent, string> = {
  blue: "accent-blue",
  green: "accent-green",
  yellow: "accent-yellow",
  red: "accent-red",
};

interface DashboardKpiCardProps {
  title: string;
  value: string;
  subtitle: string;
  accent: Accent;
  trend?: { direction: TrendDirection; percent: number };
  numberFont?: "mono" | "sans";
  loading?: boolean;
}

function TrendLabel({
  direction,
  percent,
}: {
  direction: TrendDirection;
  percent: number;
}) {
  const Icon =
    direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus;
  return (
    <span className="inline-flex items-center gap-0.5">
      <Icon className="size-3 shrink-0" aria-hidden />
      <span>{percent}%</span>
    </span>
  );
}

export default function DashboardKpiCard({
  title,
  value,
  subtitle,
  accent,
  trend,
  numberFont = "mono",
  loading,
}: DashboardKpiCardProps) {
  return (
    <div className="relative flex h-[7.75rem] flex-col overflow-hidden rounded-card border border-card-border bg-card p-5 sm:h-[8.25rem] sm:p-6">
      <p className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p
        className={cn(
          "mt-3 shrink-0 text-2xl font-bold leading-none sm:text-3xl",
          numberFont === "sans" ? "font-sans tabular-nums" : "font-numbers",
          ACCENT_VALUE[accent],
          loading && "animate-pulse text-muted-foreground"
        )}
      >
        {loading ? "—" : value}
      </p>
      <p className="mt-auto flex min-h-5 items-center gap-x-1 overflow-hidden text-xs leading-none text-muted-foreground">
        {trend ? (
          <span className="inline-flex shrink-0 items-center">
            <TrendLabel direction={trend.direction} percent={trend.percent} />
          </span>
        ) : null}
        <span className="truncate">{subtitle}</span>
      </p>
    </div>
  );
}
