import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardSectionProps {
  title: string;
  accentClass?: string;
  badge?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function DashboardSection({
  title,
  accentClass = "bg-primary",
  badge,
  action,
  children,
  className,
  contentClassName,
}: DashboardSectionProps) {
  return (
    <section
      className={cn(
        "rounded-card border border-card-border bg-card overflow-hidden",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-full", accentClass)} aria-hidden />
          <h2 className="truncate text-xs font-semibold uppercase tracking-wider text-foreground">
            {title}
          </h2>
          {badge ? (
            <span className="rounded-ui border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {badge}
            </span>
          ) : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      <div className={cn(contentClassName)}>{children}</div>
    </section>
  );
}
