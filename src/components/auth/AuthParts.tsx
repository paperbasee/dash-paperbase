import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Paperbase's mark and name, as every page before the dashboard shows it. */
export function PaperbaseBrand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-foreground", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- the site's own mark */}
      <img src="/favicon.svg" alt="" className="size-6 dark:invert" />
      {/* `compact`: the mark alone on a phone, where the bar is shared with more. */}
      <span className={compact ? "hidden sm:inline" : undefined}>Paperbase</span>
    </span>
  );
}

/** The heading every sign-in card opens with. */
export function AuthHeading({ title, body }: { title: string; body?: ReactNode }) {
  return (
    <div>
      <h1 className="text-[1.5rem] font-semibold leading-tight tracking-[-0.025em] text-foreground sm:text-[1.625rem]">
        {title}
      </h1>
      {body ? <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{body}</p> : null}
    </div>
  );
}

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-ui border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {children}
    </div>
  );
}

/** "or use your email" between two ways in. */
export function AuthDivider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {children}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
