"use client";

import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import { formatDashboardDate } from "@/lib/datetime-display";
import { cn } from "@/lib/utils";
import { THEME_EDITOR_HREF } from "@/lib/theme-editor/access";
import type { ThemeCurrent, ThemeSummary } from "@/lib/theme-editor/api";
import { BASIC_THEME_KEY, themeNameByKey } from "@/lib/theme-editor/theme-groups";
import { settingsInvertedButtonClassName } from "../SettingsSectionBody";
import { ThemePill, ThemeThumbnail, useCategoryLabel } from "./ThemeCardParts";

/** The theme shoppers see now, who last saved it, and whether a draft is waiting. */
export function CurrentThemeCard({
  themes,
  current,
  locked,
  canOpenEditor,
  previewMissing,
}: {
  themes: ThemeSummary[];
  current: ThemeCurrent;
  /** Themes are locked for the shop, so shoppers see plain Basic, not the saved theme. */
  locked: boolean;
  /** Unlocked, this member may edit, and the preview host is configured. */
  canOpenEditor: boolean;
  /** This member could edit, but the preview host is not configured, so the editor can't open. */
  previewMissing: boolean;
}) {
  const t = useTranslations("settings.customization");
  const locale = useLocale();
  const categoryText = useCategoryLabel();

  const unnamed = t("themeUnnamed");
  const liveName = themeNameByKey(themes, current.live_theme, locale, unnamed);
  const live = themes.find((theme) => theme.key === current.live_theme);
  const draftOfOther =
    current.has_draft && current.draft_theme !== null && current.draft_theme !== current.live_theme;

  let savedLine = t("notCustomized");
  if (current.published_at) {
    const date = formatDashboardDate(current.published_at, locale);
    if (locked) {
      // published_at describes the saved theme, which waits while shoppers see Basic.
      savedLine = t("savedThemeNotLive", {
        theme: themeNameByKey(themes, current.theme_key, locale, unnamed),
        date,
      });
    } else {
      savedLine = current.published_by_name
        ? t("lastSaved", { date, name: current.published_by_name })
        : t("lastSavedNoName", { date });
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-card border border-border p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <ThemeThumbnail className="w-24 shrink-0 sm:w-40" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("currentThemeHeading")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{liveName}</h3>
            <ThemePill tone="live">{t("live")}</ThemePill>
            {current.live_theme === BASIC_THEME_KEY ? (
              <ThemePill tone="plain">{t("free")}</ThemePill>
            ) : live?.category ? (
              <ThemePill tone="plain">{categoryText(live.category)}</ThemePill>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{savedLine}</p>
          {current.has_draft ? (
            <p className="pt-0.5">
              <ThemePill tone="draft">
                {draftOfOther
                  ? t("draftOfTheme", { theme: themeNameByKey(themes, current.draft_theme, locale, unnamed) })
                  : t("draftBadge")}
              </ThemePill>
            </p>
          ) : null}
        </div>
      </div>
      {canOpenEditor ? (
        <Button asChild className={cn("w-full shrink-0 sm:w-auto", settingsInvertedButtonClassName)}>
          <DeferredNavLink href={THEME_EDITOR_HREF}>{t("customize")}</DeferredNavLink>
        </Button>
      ) : previewMissing ? (
        <div className="flex w-full shrink-0 flex-col gap-1.5 sm:w-auto sm:items-end">
          <Button type="button" disabled aria-describedby="customize-preview-missing" className="w-full sm:w-auto">
            {t("customize")}
          </Button>
          <p id="customize-preview-missing" className="text-xs text-muted-foreground">
            {t("previewNotSetUp")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
