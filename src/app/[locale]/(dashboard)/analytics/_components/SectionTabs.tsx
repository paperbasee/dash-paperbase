"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import type { SectionKey } from "../_lib/types";

export const SECTIONS: SectionKey[] = ["overview", "sales", "traffic", "products", "districts", "delivery", "customers", "live"];

export function SectionTabs({
  current,
  onChange,
}: {
  current: SectionKey;
  onChange: (section: SectionKey) => void;
}) {
  const t = useTranslations("analyticsPage.sections");
  return (
    <nav
      aria-label={t("label")}
      // No line under the row or the chosen section (owner, 2026-10-04): the chosen one is
      // in bold, darker words. Sideways it scrolls, without a bar.
      className="scrollbar-hide flex gap-5 overflow-x-auto sm:gap-6"
    >
      {SECTIONS.map((section) => (
        <button
          key={section}
          type="button"
          aria-current={section === current ? "page" : undefined}
          onClick={() => onChange(section)}
          className={cn(
            "inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap px-0.5 text-sm",
            section === current
              ? "font-semibold text-foreground"
              : "font-medium text-muted-foreground hover:text-foreground",
          )}
        >
          {section === "live" ? <span className="size-[7px] rounded-full bg-emerald-600" aria-hidden /> : null}
          {t(section)}
        </button>
      ))}
    </nav>
  );
}
