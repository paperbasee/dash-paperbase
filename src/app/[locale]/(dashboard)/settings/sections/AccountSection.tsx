"use client";

import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/context/PermissionsContext";
import { useSupportMode } from "@/hooks/useSupportMode";
import { accountPageUrl } from "@/lib/accounts/config";
import { maskEmail } from "@/lib/mask-email";
import { SettingsSectionBody, settingsInvertedButtonClassName, settingsSectionSurfaceClassName } from "../SettingsSectionBody";

const ROLE_KEYS = {
  admin: "team.roleAdmin",
  manager: "team.roleManager",
  staff: "team.roleStaff",
} as const;

/**
 * Settings > Account: the person signed in, as this shop knows them. Their name, email, phone,
 * picture and passkeys are their Paperbase account's, one for every shop they work in, changed at
 * Accounts ("Your Paperbase account", guidelines/accounts-plan.md, section 10) -- the owner's name
 * too, which the shop's emails use. Paperbase support, signed in as the owner, never opens it.
 */
export default function AccountSection({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings");
  const { meProfile } = useAuth();
  const { isOwner, role } = usePermissions();
  const inSupportMode = useSupportMode();
  if (hidden || !meProfile) return null;

  // The signed-in person's place in this shop, in the page's words: the owner, or one of the
  // three fixed roles (rbac.catalog.ROLES); a member paused at the switch to fixed roles has none.
  const roleWord = isOwner
    ? t("account.roleOwner")
    : role?.slug && role.slug in ROLE_KEYS
      ? t(ROLE_KEYS[role.slug as keyof typeof ROLE_KEYS])
      : meProfile.store
        ? t("account.roleMember")
        : "";
  const name = meProfile.full_name?.trim() || "";

  return (
    <section id="panel-account" role="tabpanel" aria-labelledby="tab-account" className={settingsSectionSurfaceClassName}>
      <SettingsSectionBody>
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-foreground">{t("account.heading")}</h2>
          <p className="text-sm text-muted-foreground">{t("account.subtitle")}</p>
        </div>

        <div className="flex items-center gap-3 rounded-card border border-border bg-muted/30 p-4">
          <UserAvatar publicId={meProfile.avatar_seed || meProfile.public_id || null} name={name} className="size-11" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{name || maskEmail(meProfile.email ?? "")}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="truncate text-sm text-muted-foreground">{maskEmail(meProfile.email ?? "")}</span>
              {roleWord ? <Badge variant="secondary">{roleWord}</Badge> : null}
            </div>
          </div>
        </div>

        {isOwner ? <p className="text-sm text-muted-foreground">{t("account.ownerNameNote")}</p> : null}

        {inSupportMode ? null : (
          <Button asChild variant="outline" className={`${settingsInvertedButtonClassName} gap-2`}>
            <a href={accountPageUrl()}>
              {t("account.manage")}
              <ExternalLink className="size-4" aria-hidden />
            </a>
          </Button>
        )}
      </SettingsSectionBody>
    </section>
  );
}
