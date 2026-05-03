"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Select } from "@/components/ui/select";
import { CustomizationShell } from "../_components/CustomizationShell";
import { PalettePicker } from "../_components/PalettePicker";
import { useThemeEditor } from "../_hooks/useThemeEditor";
import { settingsSectionSurfaceClassName } from "../SettingsSectionBody";

type SettingsMessage = { type: "success" | "error"; text: string } | null;

export default function CustomizationSection({
  hidden,
  language,
  onLanguageChange,
  languageSaving,
  languageMessage,
}: {
  hidden: boolean;
  language: "en" | "bn";
  onLanguageChange: (value: "en" | "bn") => void | Promise<void>;
  languageSaving: boolean;
  languageMessage: SettingsMessage;
}) {
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
        <div className="max-w-md space-y-2">
          <label
            htmlFor="customization_store_language"
            className="text-sm font-medium leading-normal text-foreground"
          >
            {t("store.language")}
          </label>
          <Select
            id="customization_store_language"
            value={language}
            disabled={languageSaving}
            onChange={(e) => {
              const next = e.target.value as "en" | "bn";
              void onLanguageChange(next);
            }}
          >
            <option value="en">{t("store.languageOptions.en")}</option>
            <option value="bn">{t("store.languageOptions.bn")}</option>
          </Select>
          {languageMessage?.type === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              {languageMessage.text}
            </p>
          ) : null}
          {languageSaving ? (
            <p className="text-xs text-muted-foreground">{t("saving")}</p>
          ) : null}
        </div>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {tc("loadingTheme")}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
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
