"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { PageHint } from "./PageHint";

/**
 * Every dashboard page's header (owner, 2026-10-04): one row -- the title and its ? on the left;
 * the page's own buttons, its filter button and its main button on the right, in that order, all
 * on one line. On a phone the buttons drop under the title as one row rather than squeeze. What
 * the page is for lives in the ? (`hint`), never as a line under the title. No back arrow: these
 * are the main menu's pages, reached from the menu (owner, 2026-10-04).
 */
export function PageHeader({
  title,
  hint,
  children,
  className,
}: {
  title: ReactNode;
  /** What the page is for: shown from the ? beside the title. */
  hint: ReactNode;
  /** The buttons on the right: the page's own, then FilterToggle, then the main one. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-3", className)}>
      <div className="flex min-w-0 items-center gap-1.5">
        <h1 className="min-w-0 text-2xl font-medium leading-relaxed text-foreground">{title}</h1>
        <PageHint>{hint}</PageHint>
      </div>
      {children ? <div className="flex flex-wrap items-center justify-end gap-2">{children}</div> : null}
    </div>
  );
}
