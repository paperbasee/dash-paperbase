"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { CustomizationShell } from "../_components/CustomizationShell";
import { PalettePicker } from "../_components/PalettePicker";
import { useThemeEditor } from "../_hooks/useThemeEditor";
import { settingsSectionSurfaceClassName } from "../SettingsSectionBody";

export default function CustomizationSection({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings");
  const tc = useTranslations("settings.customization");
  const { theme, loading, saving, error, selectPalette } = useThemeEditor();

  return (
    <section
      id="panel-customization"
      role="tabpanel"
      aria-labelledby="tab-customization"
      hidden={hidden}
      className={settingsSectionSurfaceClassName}
    >
      <CustomizationShell title={tc("heading")} description={tc("subtitle")}>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {tc("loadingTheme")}
          </div>
        ) : (
          <div className="space-y-4">
            {error === "saveFailed" ? (
              <p className="text-sm text-destructive" role="alert">
                {tc("saveFailed")}
              </p>
            ) : null}
            <PalettePicker
              selectedPalette={theme?.palette ?? null}
              onSelect={selectPalette}
              disabled={saving}
            />
            {saving ? (
              <p className="text-xs text-muted-foreground">{t("saving")}</p>
            ) : null}
          </div>
        )}
      </CustomizationShell>
    </section>
  );
}
