import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FilterBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="rounded-card border border-card-border bg-card p-3">
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-2",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
