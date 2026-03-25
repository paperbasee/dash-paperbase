import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AuthPageShellProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}

export function AuthPageShell({
  children,
  className,
  containerClassName,
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
            "w-full max-w-md space-y-8 sm:space-y-10",
            containerClassName
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

