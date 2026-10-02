"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { LockMark } from "./LockMark";

import type { SectionKey } from "../_lib/types";

export const SECTIONS: SectionKey[] = ["overview", "sales", "traffic", "products", "districts", "delivery", "customers", "live"];
/** What a Basic plan opens: the core sales. */
export const CORE_SECTIONS: SectionKey[] = ["overview", "sales"];

export function SectionTabs({
  current,
  onChange,
  locked,
}: {
  current: SectionKey;
  onChange: (section: SectionKey) => void;
  /** A section this plan doesn't open: its tab carries Premium's crown. */
  locked?: (section: SectionKey) => boolean;
}) {
  const t = useTranslations("analyticsPage.sections");
  const tPremium = useTranslations("analyticsPage");
  return (
    <nav
      aria-label={t("label")}
      // The hairline under the tabs is drawn inside the row, so the row never
      // overflows downwards; sideways it scrolls, without a bar.
      className="scrollbar-hide flex gap-5 overflow-x-auto shadow-[inset_0_-1px_0_hsl(var(--border))] sm:gap-6"
    >
      {SECTIONS.map((section) => (
        <button
          key={section}
          type="button"
          aria-current={section === current ? "page" : undefined}
          onClick={() => onChange(section)}
          className={cn(
            "inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-0.5 text-sm",
            section === current
              ? "border-foreground font-semibold text-foreground"
              : "border-transparent font-medium text-muted-foreground hover:text-foreground",
          )}
        >
          {section === "live" ? <span className="size-[7px] rounded-full bg-emerald-600" aria-hidden /> : null}
          {t(section)}
          {locked?.(section) ? <LockMark label={tPremium("premium.badge")} /> : null}
        </button>
      ))}
    </nav>
  );
}
