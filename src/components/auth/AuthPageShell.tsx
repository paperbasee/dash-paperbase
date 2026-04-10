import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AuthPageShellProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  appName?: string;
  headline?: string;
  description?: string;
  /** When false, hides the default legal/footer strip (e.g. login & signup use their own copy). */
  showFooter?: boolean;
}

export function AuthPageShell({
  children,
  className,
  containerClassName,
  appName = "Paperbase",
  headline,
  description,
  showFooter = true,
}: AuthPageShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-muted/30 px-4 py-6",
        className
      )}
    >
      <main className="flex flex-1 items-center justify-center">
        <div
          className={cn(
            "w-full max-w-[30rem] space-y-8",
            containerClassName
          )}
        >
          <div className="space-y-3 text-center">
            {appName ? (
              <p className="text-base font-semibold tracking-wide text-foreground/80">{appName}</p>
            ) : null}
            {headline ? (
              <h1 className="mx-auto max-w-[32ch] text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {headline}
              </h1>
            ) : null}
            {description ? (
              <p className="mx-auto max-w-[32ch] text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {children}
        </div>
      </main>
      {showFooter ? (
        <footer className="pb-4 text-center text-xs text-muted-foreground/90 sm:pb-6">
          Terms of Service • Privacy Policy • © 2026 Paperbase
        </footer>
      ) : null}
    </div>
  );
}

