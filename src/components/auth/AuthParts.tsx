import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * "Paperbase" in the sign-in headings' serif: the name alone, no mark (owner, 2026-09-28 --
 * "don't use the Paperbase logo, just the same Paperbase text as the sign up").
 */
export function PaperbaseWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-[1.625rem] leading-none tracking-[-0.01em] text-foreground [font-family:var(--font-instrument-serif),serif]",
        className
      )}
    >
      Paperbase
    </span>
  );
}

/**
 * The heading every sign-in page opens with: a tall, narrow serif (Instrument Serif, the owner's
 * design of 2026-09-28), with Bangla falling back to the dashboard's Bangla face.
 */
export function AuthHeading({ title, body, className }: { title: string; body?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h1 className="text-[2.25rem] font-normal leading-[1.05] tracking-[-0.01em] text-foreground [font-family:var(--font-instrument-serif),var(--font-noto-sans-bengali),serif] sm:text-[2.75rem]">
        {title}
      </h1>
      {body ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p> : null}
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
