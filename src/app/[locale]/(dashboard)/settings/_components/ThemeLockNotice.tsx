"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import type { ThemeLock } from "@/lib/theme-editor/access";
import { settingsInvertedButtonClassName } from "../SettingsSectionBody";

/**
 * Why themes are locked for this shop. Only the owner holds the plan, so only the
 * owner is sent to /plans; anyone else is told who can unlock it.
 */
export function ThemeLockNotice({
  lock,
  isOwner,
  hasSavedWork,
}: {
  lock: ThemeLock;
  isOwner: boolean;
  /** A saved theme or a draft exists, so the notice says it is kept. */
  hasSavedWork: boolean;
}) {
  const t = useTranslations("settings.customization");

  let title: string;
  let body: string | null = null;
  let cta: string | null = null;
  if (lock === "not_entitled") {
    title = t("lockNotEntitledTitle");
    body = isOwner ? t("lockNotEntitledBody") : t("askOwnerUpgrade");
    cta = isOwner ? t("upgradeCta") : null;
  } else if (lock === "payment_pending") {
    title = t("lockPaymentPending");
  } else {
    // "Renew to edit. Your theme is kept." already says it is kept.
    title = t("lockExpired");
    body = isOwner ? null : t("askOwnerRenew");
    cta = isOwner ? t("renewCta") : null;
  }
  const kept = hasSavedWork && lock !== "expired" ? t("lockKept") : null;

  return (
    <div role="status" className="space-y-3 rounded-card border border-border bg-muted/30 p-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-tooltip border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
            <Lock className="size-3 shrink-0" aria-hidden />
            {t("premiumBadge")}
          </span>
          <p className="text-sm font-medium text-foreground">{title}</p>
        </div>
        {body ? <p className="text-sm text-muted-foreground">{body}</p> : null}
        {kept ? <p className="text-sm text-muted-foreground">{kept}</p> : null}
      </div>
      {cta ? (
        <Button asChild size="sm" className={settingsInvertedButtonClassName}>
          <DeferredNavLink href="/plans">{cta}</DeferredNavLink>
        </Button>
      ) : null}
    </div>
  );
}
