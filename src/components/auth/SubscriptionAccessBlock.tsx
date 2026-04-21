"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { logout } from "@/lib/auth";

type Variant = "inactive" | "verifyFailed" | "serverUnreachable";

/**
 * Full-screen messaging for subscription gate failures (dashboard, onboarding, standalone page).
 */
export default function SubscriptionAccessBlock({ variant }: { variant: Variant }) {
  const tLayout = useTranslations("dashboardLayout");
  const tPlan = useTranslations("planNotActive");
  const tCommon = useTranslations("common");

  const isInactive = variant === "inactive";
  const isServerUnreachable = variant === "serverUnreachable";

  return (
    <AuthPageShell>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {isInactive
            ? tPlan("title")
            : isServerUnreachable
              ? tLayout("serverUnreachableTitle")
              : tLayout("subscriptionVerifyTitle")}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {isInactive
            ? tPlan("body")
            : isServerUnreachable
              ? tLayout("serverUnreachableBody")
              : tLayout("subscriptionVerifyBody")}
        </p>
      </div>

      <div className="mx-auto w-11/12 max-w-sm space-y-3 sm:w-full">
        {isInactive ? (
          <Button asChild className="w-full">
            <a href="mailto:noreply@mail.paperbase.me">{tCommon("contactSupport")}</a>
          </Button>
        ) : (
          <Button type="button" className="w-full" onClick={() => window.location.reload()}>
            {isServerUnreachable ? tCommon("retry") : tCommon("reload")}
          </Button>
        )}
        <Button type="button" variant="outline" className="w-full" onClick={() => logout()}>
          {tCommon("signOut")}
        </Button>
      </div>
    </AuthPageShell>
  );
}
