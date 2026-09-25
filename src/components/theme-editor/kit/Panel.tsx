"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { HELP, ROUND } from "./styles";

/**
 * The frame every settings view in the editor sits in (2026-09-26): a title,
 * one line saying what this is, a way out, and the settings under them with
 * room to breathe.
 *
 * The side panel on a computer and the sheet on a phone are the same frame --
 * only where it stands changes -- so a merchant who learns one has learned
 * both. `onClose` draws the ✕ (back to Style); `onBack` draws an arrow, for a
 * view reached from another.
 */
export function KitPanel({
  title,
  hint,
  onClose,
  onBack,
  aside,
  children,
  className,
}: {
  title: ReactNode;
  hint?: ReactNode;
  onClose?: () => void;
  onBack?: () => void;
  /** Something beside the title: a badge, a status. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const t = useTranslations("themeEditor.kit");
  return (
    <section className={cn("flex min-h-0 flex-col", className)}>
      <header className="flex items-start gap-3 px-5 pb-2 pt-5">
        {onBack ? (
          <button type="button" className={cn(ROUND, "-ml-1.5")} aria-label={t("back")} onClick={onBack}>
            <ArrowLeft className="size-4" aria-hidden />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 text-[15px] font-semibold leading-snug text-foreground">
            {title}
            {aside}
          </h2>
          {hint ? <p className={cn(HELP, "mt-1 max-w-[46ch] text-[12.5px]")}>{hint}</p> : null}
        </div>
        {onClose ? (
          <button type="button" className={cn(ROUND, "-mr-1.5 bg-muted/60")} aria-label={t("close")} onClick={onClose}>
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-3">
        <div className="flex flex-col gap-7">{children}</div>
      </div>
    </section>
  );
}

/**
 * Settings that belong together, under a small caption -- by space, not a box.
 * `aside` sits at the caption's end: the switch that turns the whole group on,
 * a count.
 */
export function KitGroup({
  title,
  aside,
  children,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      {title || aside ? (
        <div className="flex min-h-8 items-center gap-2">
          {title ? <p className="text-[13.5px] font-medium text-foreground">{title}</p> : null}
          {aside ? <div className="ml-auto flex items-center">{aside}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/** A soft note: why a place is set, what is not saved yet, a list that failed. */
export function KitNote({ children, role }: { children: ReactNode; role?: "alert" | "status" }) {
  return (
    <p role={role} className="rounded-card bg-muted/60 px-3.5 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}
