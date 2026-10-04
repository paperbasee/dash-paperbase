"use client";

import { useTranslations } from "next-intl";
import { KeyRound, ShieldCheck } from "lucide-react";

import { SettingsSectionBody } from "../SettingsSectionBody";

/**
 * Sign-in is passwordless (passkeys + email magic-links), so there is no
 * password to change and no separate TOTP to manage. Passkeys are managed per
 * account under Settings → Account, so this section just explains the model.
 */
export default function SecuritySection({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings.security");
  if (hidden) return null;

  return (
    <SettingsSectionBody>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{t("heading")}</h2>
        <p className="text-sm text-muted-foreground">{t("passwordless")}</p>
      </div>

      <div className="rounded-card border border-border bg-background p-6 space-y-4">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-500" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{t("phishingTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("phishingBody")}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <KeyRound size={20} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{t("manageTitle")}</p>
            <p className="text-sm text-muted-foreground">
              {t.rich("manageBody", {
                place: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
              })}
            </p>
          </div>
        </div>
      </div>
    </SettingsSectionBody>
  );
}
