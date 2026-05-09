"use client";

import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import type { SettingsSection } from "@/app/[locale]/(dashboard)/settings/settingsSections";
import { SECTIONS } from "@/app/[locale]/(dashboard)/settings/settingsSections";
import { cn } from "@/lib/utils";

export default function SettingsSidebarNav({
  collapsed,
  pathname,
  settingsActiveSection,
  shouldPrefetchLinks,
  onNavigate,
  tCommonSettingsLabel,
  tBackToHomeLabel,
  tSettings,
}: {
  collapsed: boolean;
  pathname: string;
  settingsActiveSection: SettingsSection;
  shouldPrefetchLinks: boolean;
  onNavigate: () => void;
  tCommonSettingsLabel: string;
  tBackToHomeLabel: string;
  tSettings: (key: string) => string;
}) {
  return (
    <>
      {!collapsed && (
        <p className="mb-2 px-1 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {tCommonSettingsLabel}
        </p>
      )}

      <Link
        href="/"
        prefetch={shouldPrefetchLinks}
        onClick={onNavigate}
        className={cn(
          "group flex items-center justify-between gap-2 rounded-xs px-2.5 py-1.5 text-sm font-normal w-full transition-colors",
          "text-muted-foreground hover:bg-accent hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.07] dark:hover:text-white/90",
          collapsed && "justify-center px-2"
        )}
        title={collapsed ? tBackToHomeLabel : undefined}
        aria-label={tBackToHomeLabel}
      >
        <span
          className={cn(
            "flex items-center gap-2",
            collapsed ? "justify-center" : "min-w-0 flex-1"
          )}
        >
          <ArrowLeft className="size-5 shrink-0" />
          {!collapsed && <span className="truncate">{tBackToHomeLabel}</span>}
        </span>
      </Link>

      {SECTIONS.map((row) => {
        const id = row.id;
        const Icon = row.icon;
        const label = "labelKey" in row ? tSettings(row.labelKey) : row.displayLabel;
        const active = settingsActiveSection === id;
        const href = `/settings?tab=${encodeURIComponent(id)}`;
        return (
          <Link
            key={id}
            href={href}
            prefetch={shouldPrefetchLinks}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center justify-between gap-2 rounded-xs px-2.5 py-1.5 text-sm font-normal w-full transition-colors",
              active
                ? "bg-accent text-foreground dark:bg-white/[0.12] dark:text-white/95"
                : "text-muted-foreground hover:bg-accent hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.07] dark:hover:text-white/90",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? label : undefined}
          >
            <span
              className={cn(
                "flex items-center gap-2",
                collapsed ? "justify-center" : "min-w-0 flex-1"
              )}
            >
              <Icon className="size-5 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </span>
          </Link>
        );
      })}
    </>
  );
}

