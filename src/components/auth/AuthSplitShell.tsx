import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { AuthLanguageSwitch } from "./AuthLanguageSwitch";
import { AuthShowcase } from "./AuthShowcase";

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

/**
 * Sign in, sign up and the pages an email link opens (owner, 2026-09-28): the form on the left,
 * and on a computer the shop picture on the right (AuthShowcase). A phone gets the form alone.
 */
export function AuthSplitShell({
  showcase,
  footer,
  children,
}: {
  showcase: "signin" | "signup";
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="pb-motion grid min-h-dvh bg-background lg:grid-cols-[minmax(26rem,1fr)_minmax(0,1.15fr)]">
      <div className="flex min-h-dvh flex-col px-5 py-5 sm:px-10 sm:py-8">
        <header className="flex items-center justify-between">
          <PaperbaseBrand />
          <AuthLanguageSwitch />
        </header>
        <main className="mx-auto flex w-full max-w-[23rem] flex-1 flex-col justify-center py-8 sm:py-10">
          {children}
        </main>
        {footer ? <footer className="text-center text-sm text-muted-foreground">{footer}</footer> : null}
      </div>
      <div className="hidden min-w-0 p-3 lg:block">
        <div className="sticky top-3 h-[calc(100dvh-1.5rem)]">
          <AuthShowcase variant={showcase} />
        </div>
      </div>
    </div>
  );
}

/** The heading block every auth page opens with. */
export function AuthHeading({ title, body }: { title: string; body?: ReactNode }) {
  return (
    <div>
      <h1 className="text-[1.625rem] font-semibold leading-tight tracking-[-0.025em] text-foreground sm:text-[1.875rem]">
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
