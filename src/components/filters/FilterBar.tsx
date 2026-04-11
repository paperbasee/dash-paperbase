import type { ReactNode } from "react";

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-card-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
