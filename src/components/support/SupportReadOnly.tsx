"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { useSupportMode } from "@/hooks/useSupportMode";
import { cn } from "@/lib/utils";

/**
 * What stays the owner's while Paperbase support is in the dashboard (owner, 2026-09-29): shown,
 * greyed, and closed to changes -- a disabled fieldset turns off every field and button inside,
 * and links go quiet -- under one line that says why. The API refuses these changes regardless
 * (support_sessions.blocked: the owner's account, and the owner's powers); this is so nobody has to try to find out.
 *
 * For the owner themselves it is nothing at all.
 */
export function SupportReadOnly({
  children,
  className,
  centered = false,
}: {
  children: ReactNode;
  className?: string;
  /** The note under a centred page's heading, rather than at its left edge. */
  centered?: boolean;
}) {
  const inSupport = useSupportMode();
  const t = useTranslations("supportMode");
  if (!inSupport) return <>{children}</>;
  return (
    <div className={className}>
      <p
        className={cn(
          "mb-2.5 flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-300",
          centered && "justify-center"
        )}
      >
        <Lock className="size-3.5" aria-hidden />
        {t("readOnly")}
      </p>
      <fieldset
        disabled
        className="m-0 min-w-0 border-0 p-0 opacity-55 grayscale select-none [&_a]:pointer-events-none"
      >
        {children}
      </fieldset>
    </div>
  );
}
