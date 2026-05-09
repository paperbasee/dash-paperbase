"use client";

import { useTranslations } from "next-intl";
import { SECTIONS, type SettingsSection } from "./settingsSections";
import { cn } from "@/lib/utils";

export function SettingsSectionNav({
  activeSection,
  onSelect,
  onNavigate,
  className,
}: {
  activeSection: SettingsSection;
  onSelect: (id: SettingsSection) => void;
  onNavigate?: () => void;
  className?: string;
}) {
  const t = useTranslations("settings");
  return (
    <nav
      className={cn("flex flex-col gap-0.5", className)}
      role="tablist"
      aria-label={t("navAria")}
    >
      {SECTIONS.map((row) => {
        const { id, icon: Icon } = row;
        const label =
          "labelKey" in row ? t(row.labelKey) : row.displayLabel;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeSection === id}
            aria-controls={`panel-${id}`}
            id={`tab-${id}`}
            onClick={() => {
              onSelect(id);
              onNavigate?.();
            }}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xs px-3 py-2.5 text-left text-sm font-medium transition-colors",
              activeSection === id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
