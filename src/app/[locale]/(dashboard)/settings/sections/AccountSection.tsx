"use client";

import { useRef, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SupportReadOnly } from "@/components/support/SupportReadOnly";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/context/PermissionsContext";
import { maskEmail } from "@/lib/mask-email";
import {
  SettingsSectionBody,
  settingsInvertedButtonClassName,
  settingsSectionSurfaceClassName,
} from "../SettingsSectionBody";

type SettingsMessage = { type: "success" | "error"; text: string } | null;

const ROLE_KEYS = {
  admin: "team.roleAdmin",
  manager: "team.roleManager",
  staff: "team.roleStaff",
} as const;

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
  const formRef = useRef<HTMLFormElement>(null);
  const { handleKeyDown } = useEnterNavigation(() => formRef.current?.requestSubmit());
  const { meProfile } = useAuth();
  const { isOwner, isSuperuser, role } = usePermissions();
  // "My Account" is visible to everyone (each user manages their own passkeys and
  // sees their own email/role below). Only the store-OWNER identity form is
  // owner-only, so staff never see or edit the owner's name/email.
  const canEditOwnerIdentity = isOwner || isSuperuser;
  // The signed-in user's own identity (distinct from the store owner details
  // edited below) — so a moderator sees their own email and role, not the owner's.
  const myEmail = meProfile?.email?.trim() || "";
  // The signed-in person's place in this shop, in the page's words: the owner, or one of the
  // three fixed roles (rbac.catalog.ROLES); a member paused at the switch to fixed roles has none.
  const roleWord = isOwner
    ? t("account.roleOwner")
    : role?.slug && role.slug in ROLE_KEYS
      ? t(ROLE_KEYS[role.slug as keyof typeof ROLE_KEYS])
      : meProfile?.store
        ? t("account.roleMember")
        : "";
  const accountEmailLabel = roleWord ? t("account.roleEmail", { role: roleWord }) : t("account.heading");
  return (
    <section
      id="panel-account"
      role="tabpanel"
      aria-labelledby="tab-account"
      hidden={hidden}
      className={settingsSectionSurfaceClassName}
    >
      {!isLoading ? (
        <SettingsSectionBody>
          {myEmail && (
            <div className="rounded-card border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">
                {accountEmailLabel}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="truncate text-sm text-muted-foreground">
                  {maskEmail(myEmail)}
                </span>
                {roleWord && <Badge variant="secondary">{roleWord}</Badge>}
              </div>
            </div>
          )}

          {canEditOwnerIdentity && (
          <SupportReadOnly>
          <form ref={formRef} onSubmit={onSubmit} className="w-full space-y-6">
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
                onKeyDown={handleKeyDown}
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
                type="text"
                // Read-only display is masked; the real address stays in the
                // controller's state, so form submit is unaffected.
                value={maskEmail(ownerEmail)}
                readOnly
                tabIndex={-1}
                className="w-full cursor-not-allowed bg-muted text-muted-foreground"
                onKeyDown={handleKeyDown}
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
            className={`${settingsInvertedButtonClassName} gap-2`}
            disabled={accountSaving}
          >
            {accountSaving && <Loader2 className="size-4 animate-spin" />}
            {t("account.saveButton")}
          </Button>
          </form>
          </SupportReadOnly>
          )}
        </SettingsSectionBody>
      ) : null}
    </section>
  );
}

