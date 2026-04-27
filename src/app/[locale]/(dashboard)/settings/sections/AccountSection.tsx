"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SettingsSectionBody,
  settingsInvertedButtonClassName,
  settingsSectionSurfaceClassName,
} from "../SettingsSectionBody";
import { SettingsSectionSkeleton } from "@/components/skeletons/dashboard-skeletons";

type SettingsMessage = { type: "success" | "error"; text: string } | null;

export default function AccountSection({
  hidden,
  isLoading,
  ownerName,
  ownerEmail,
  onOwnerNameChange,
  accountSaving,
  accountMessage,
  onSubmit,
}: {
  hidden: boolean;
  isLoading: boolean;
  ownerName: string;
  ownerEmail: string;
  onOwnerNameChange: Dispatch<SetStateAction<string>> | ((value: string) => void);
  accountSaving: boolean;
  accountMessage: SettingsMessage;
  onSubmit: (e: FormEvent) => void;
}) {
  const t = useTranslations("settings");
  return (
    <section
      id="panel-account"
      role="tabpanel"
      aria-labelledby="tab-account"
      hidden={hidden}
      className={settingsSectionSurfaceClassName}
    >
      {isLoading ? (
        <SettingsSectionBody>
          <SettingsSectionSkeleton />
        </SettingsSectionBody>
      ) : (
        <SettingsSectionBody>
          <form onSubmit={onSubmit} className="w-full space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-medium text-foreground">{t("account.heading")}</h2>
            <p className="text-sm text-muted-foreground">{t("account.subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="owner_name" className="text-sm font-medium leading-normal text-foreground">
                {t("account.ownerName")}
              </label>
              <Input
                id="owner_name"
                value={ownerName}
                onChange={(e) => onOwnerNameChange(e.target.value)}
                placeholder={t("account.ownerNamePlaceholder")}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="owner_email" className="text-sm font-medium leading-normal text-foreground">
                  {t("account.ownerEmail")}
                </label>
                {ownerEmail.trim() ? (
                  <Badge
                    variant="secondary"
                    className="border-transparent bg-emerald-100 font-normal text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                  >
                    {t("account.emailVerified")}
                  </Badge>
                ) : null}
              </div>
              <Input
                id="owner_email"
                type="email"
                value={ownerEmail}
                readOnly
                tabIndex={-1}
                className="w-full cursor-not-allowed bg-muted text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">{t("account.emailReadonlyHint")}</p>
            </div>
          </div>

          {accountMessage && (
            <p
              className={
                accountMessage.type === "success" ? "text-sm text-green-600" : "text-sm text-destructive"
              }
            >
              {accountMessage.text}
            </p>
          )}

          <Button
            type="submit"
            variant="outline"
            className={settingsInvertedButtonClassName}
            disabled={accountSaving}
          >
            {accountSaving ? t("saving") : t("account.saveButton")}
          </Button>
          </form>
        </SettingsSectionBody>
      )}
    </section>
  );
}

