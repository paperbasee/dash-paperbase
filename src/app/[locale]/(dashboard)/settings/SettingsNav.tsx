"use client";

import { useTranslations } from "next-intl";
import type { SettingsSection } from "./settingsSections";
import { useVisibleSettingsSections } from "./useVisibleSettingsSections";
import { NAV_ICON_WEIGHT } from "@/components/sidebar/nav-icons";
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
  const visibleSections = useVisibleSettingsSections();
  return (
    <nav
      className={cn("flex flex-col gap-0.5", className)}
      role="tablist"
      aria-label={t("navAria")}
    >
      {visibleSections.map((row) => {
        const { id, icon: Icon } = row;
        const label =
          t(row.labelKey);
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
            <Icon weight={NAV_ICON_WEIGHT} className="size-4 shrink-0" aria-hidden />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
