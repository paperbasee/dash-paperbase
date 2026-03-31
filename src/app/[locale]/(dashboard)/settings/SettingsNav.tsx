"use client";

import { forwardRef } from "react";
import { useTranslations } from "next-intl";
import { SECTIONS, type SettingsSection } from "./settingsSections";
import { cn } from "@/lib/utils";

export function SettingsSectionNav({
  activeSection,
  onSelect,
  onNavigate,
  className,
  variant = "vertical",
}: {
  activeSection: SettingsSection;
  onSelect: (id: SettingsSection) => void;
  onNavigate?: () => void;
  className?: string;
  variant?: "vertical" | "horizontal";
}) {
  const t = useTranslations("settings");
  return (
    <nav
      className={cn(
        variant === "vertical" ? "flex flex-col gap-0.5" : "flex flex-row flex-nowrap gap-2",
        className
      )}
      role="tablist"
      aria-label={t("navAria")}
    >
      {SECTIONS.map(({ id, labelKey, icon: Icon }) => (
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
            "flex items-center gap-2 text-sm font-medium transition-colors shrink-0",
            variant === "vertical" && "rounded-lg px-3 py-2.5 text-left",
            variant === "horizontal" && "rounded-none border px-4 py-2.5 text-center text-sm whitespace-nowrap",
            variant === "vertical" &&
              (activeSection === id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"),
            variant === "horizontal" &&
              (activeSection === id
                ? "border-border bg-foreground text-background"
                : "border-border bg-transparent text-muted-foreground hover:text-foreground")
          )}
        >
          <Icon className="size-4 shrink-0" />
          {t(labelKey)}
        </button>
      ))}
    </nav>
  );
}

export const SettingsDesktopSectionNav = forwardRef<
  HTMLDivElement,
  {
    activeSection: SettingsSection;
    onSelect: (id: SettingsSection) => void;
  }
>(function SettingsDesktopSectionNav({ activeSection, onSelect }, ref) {
  return (
    <div ref={ref} className="w-full max-w-full overflow-x-auto">
      <SettingsSectionNav
        activeSection={activeSection}
        onSelect={onSelect}
        variant="horizontal"
        className="w-max min-w-max"
      />
    </div>
  );
});

SettingsDesktopSectionNav.displayName = "SettingsDesktopSectionNav";
