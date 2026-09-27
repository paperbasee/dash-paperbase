"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import type { SectionKey } from "../_lib/types";

export const SECTIONS: SectionKey[] = ["overview", "sales", "traffic", "products", "districts", "delivery", "customers", "live"];
/** What a Basic plan opens: the core sales. */
export const CORE_SECTIONS: SectionKey[] = ["overview", "sales"];

export function SectionTabs({ current, onChange }: { current: SectionKey; onChange: (section: SectionKey) => void }) {
  const t = useTranslations("analyticsPage.sections");
  return (
    <nav
      aria-label={t("label")}
      className="-mx-4 flex gap-5 overflow-x-auto border-b border-border bg-card px-4 sm:mx-0 sm:rounded-t-card"
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
        </button>
      ))}
    </nav>
  );
}
