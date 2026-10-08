"use client";

import { useTranslations } from "next-intl";
import { KeyRound, ShieldCheck } from "lucide-react";

import { useSupportMode } from "@/hooks/useSupportMode";
import { accountPageUrl } from "@/lib/accounts/config";

import { SettingsSectionBody } from "../SettingsSectionBody";

/**
 * Sign-in is passwordless (passkeys, and the email's link or code), so there is no password to
 * change. Passkeys are each person's own, in their Paperbase account at Accounts, so this section
 * explains the model and links there (not for Paperbase support, which never opens it).
 */
export default function SecuritySection({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings.security");
  const inSupportMode = useSupportMode();
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
                place: (chunks) =>
                  inSupportMode ? (
                    <span className="font-medium text-foreground">{chunks}</span>
                  ) : (
                    <a href={accountPageUrl()} className="font-medium text-foreground underline underline-offset-4">
                      {chunks}
                    </a>
                  ),
              })}
            </p>
          </div>
        </div>
      </div>
    </SettingsSectionBody>
  );
}
