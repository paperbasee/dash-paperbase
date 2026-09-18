"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ThemeCurrent, ThemeSummary } from "@/lib/theme-editor/api";
import {
  BASIC_THEME_KEY,
  categoryLabel,
  groupThemes,
  themeName,
} from "@/lib/theme-editor/theme-groups";

const sk = "rounded-sm bg-muted-foreground/15";

/** A page outline: header, banner, product row. Real theme pictures come with the designs. */
export function ThemeThumbnail({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none flex aspect-[16/10] flex-col gap-1.5 overflow-hidden rounded-card border border-border bg-muted/40 p-2",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn("h-1.5 w-8", sk)} />
        <div className="flex gap-1">
          <div className={cn("h-1.5 w-3", sk)} />
          <div className={cn("h-1.5 w-3", sk)} />
          <div className={cn("h-1.5 w-3", sk)} />
        </div>
      </div>
      <div className={cn("h-1/3 w-full", sk)} />
      <div className="grid flex-1 grid-cols-3 gap-1.5">
        <div className={sk} />
        <div className={sk} />
        <div className={sk} />
      </div>
    </div>
  );
}

const pillTone = {
  live: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  draft: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  plain: "border-border bg-muted/50 text-muted-foreground",
} as const;

export function ThemePill({ tone, children }: { tone: keyof typeof pillTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        pillTone[tone],
      )}
    >
      {children}
    </span>
  );
}

/** A category's label in the viewer's language. */
export function useCategoryLabel() {
  const t = useTranslations("settings.customization");
  return (category: string | null) => {
    const label = categoryLabel(category);
    return "key" in label ? t(label.key) : label.text;
  };
}

type ThemeLibraryProps = {
  themes: ThemeSummary[];
  current: ThemeCurrent;
  /** Unlocked and this member may edit; otherwise the list is read-only. */
  /** canEdit and the preview host is configured: opening a theme needs the editor. */
  canOpenEditor: boolean;
  /** The theme whose action is running; every action waits while one runs. */
  busyKey: string | null;
  onTry: (theme: ThemeSummary) => void;
};

export function ThemeLibrary({
  themes,
  current,
  canOpenEditor,
  busyKey,
  onTry,
}: ThemeLibraryProps) {
  const t = useTranslations("settings.customization");
  const locale = useLocale();
  const categoryText = useCategoryLabel();
  const { basic, groups, showHeadings } = groupThemes(themes);

  function card(theme: ThemeSummary) {
    const name = themeName(theme, locale);
    const isLive = theme.key === current.live_theme;
    const isDraft = current.has_draft && current.draft_theme === theme.key;

    // Every theme keeps its own design, so opening one costs nothing and asks
    // nothing. A theme the shop has worked on says so, rather than inviting a
    // merchant to "try" what they already built.
    const started = current.started_themes.includes(theme.key);
    let action: ReactNode = null;
    if (canOpenEditor && !isLive) {
      action = (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          loading={busyKey === theme.key}
          disabled={busyKey !== null}
          onClick={() => onTry(theme)}
          aria-label={t(started ? "continueThemeLabel" : "tryThemeLabel", { theme: name })}
        >
          {t(started ? "continueTheme" : "tryTheme")}
        </Button>
      );
    }

    return (
      <li key={theme.key} className="flex flex-col gap-3 rounded-card border border-border p-3">
        <ThemeThumbnail />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-auto font-medium text-foreground">{name}</span>
          {isLive ? <ThemePill tone="live">{t("live")}</ThemePill> : null}
          {isDraft ? <ThemePill tone="draft">{t("draft")}</ThemePill> : null}
          {theme.key === BASIC_THEME_KEY ? <ThemePill tone="plain">{t("free")}</ThemePill> : null}
        </div>
        {action}
      </li>
    );
  }

  const grid = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">{t("themesHeading")}</h3>
      <ul className={grid}>
        {basic ? card(basic) : null}
        {showHeadings ? null : groups.flatMap((group) => group.themes).map(card)}
      </ul>
      {showHeadings
        ? groups.map((group) => (
            <section key={group.category ?? ""} className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {categoryText(group.category)}
              </h4>
              <ul className={grid}>{group.themes.map(card)}</ul>
            </section>
          ))
        : null}
    </div>
  );
}
