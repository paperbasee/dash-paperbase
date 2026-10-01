"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";

import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import { Button } from "@/components/ui/button";
import { ROLE_MESSAGES, isRoleSlug } from "@/config/permissions";
import { usePermissions } from "@/context/PermissionsContext";
import { usePathname } from "@/i18n/navigation";
import { pageRule } from "@/lib/page-access";

/**
 * Shows the page only to a member whose role includes it (lib/page-access.ts); everyone else --
 * someone who typed the address, or followed an old link -- is told so plainly. The owner and
 * Paperbase superusers pass everywhere, and nothing is hidden while the permissions are loading.
 * The API refuses the same requests either way; this only spares the member a broken page.
 */
export function PageAccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { has, canViewApp, isUnknown, role } = usePermissions();
  const t = useTranslations("pageAccess");
  const tTeam = useTranslations("settings.team");

  const { appId, key } = pageRule(pathname);
  if (isUnknown || ((!appId || canViewApp(appId)) && (!key || has(key)))) return <>{children}</>;

  const roleName = isRoleSlug(role?.slug) ? tTeam(ROLE_MESSAGES[role.slug].name) : null;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Lock className="size-5" aria-hidden />
      </span>
      <div className="space-y-2">
        <h1 className="text-lg font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {roleName ? t("body", { role: roleName }) : t("bodyNoRole")}
        </p>
      </div>
      <Button variant="outline" asChild>
        <DeferredNavLink href="/">{t("home")}</DeferredNavLink>
      </Button>
    </div>
  );
}
