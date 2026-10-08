"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { signOut } from "@/lib/auth";

/**
 * Full-screen messaging when the dashboard cannot go on: the account's plan could not be checked.
 * A part of Paperbase not answering has its own page (server-unreachable, components/unreachable).
 */
export default function SubscriptionAccessBlock() {
  const t = useTranslations("dashboardLayout");
  const tCommon = useTranslations("common");

  return (
    <AuthPageShell>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{t("subscriptionVerifyTitle")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("subscriptionVerifyBody")}</p>
      </div>

      <div className="mx-auto w-11/12 max-w-sm space-y-3 sm:w-full">
        <Button type="button" className="w-full" onClick={() => window.location.reload()}>
          {tCommon("reload")}
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={() => void signOut()}>
          {tCommon("signOut")}
        </Button>
      </div>
    </AuthPageShell>
  );
}
