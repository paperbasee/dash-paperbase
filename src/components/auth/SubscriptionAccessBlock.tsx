"use client";

import { useTranslations } from "next-intl";
import { StatusNoticeBar } from "@/components/status/StatusNoticeBar";
import { Button } from "@/components/ui/button";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { useStatusNotice } from "@/hooks/useStatusNotice";
import { signOut } from "@/lib/auth";

type Variant = "inactive" | "verifyFailed" | "serverUnreachable" | "signInUnreachable";

const WORDS: Record<Variant, { title: string; body: string }> = {
  inactive: { title: "planNotActive.title", body: "planNotActive.body" },
  verifyFailed: { title: "dashboardLayout.subscriptionVerifyTitle", body: "dashboardLayout.subscriptionVerifyBody" },
  serverUnreachable: { title: "dashboardLayout.serverUnreachableTitle", body: "dashboardLayout.serverUnreachableBody" },
  signInUnreachable: { title: "dashboardLayout.signInUnreachableTitle", body: "dashboardLayout.signInUnreachableBody" },
};

/**
 * Full-screen messaging when the dashboard cannot go on: a plan not active, an account status that
 * could not be checked, or a part of Paperbase that is not answering -- the API, or Accounts where
 * everyone signs in (guidelines/accounts-plan.md, step 3) -- with the status page's notice above,
 * which says what Paperbase knows of it.
 */
export default function SubscriptionAccessBlock({ variant }: { variant: Variant }) {
  const t = useTranslations();
  const tCommon = useTranslations("common");
  const unreachable = variant === "serverUnreachable" || variant === "signInUnreachable";
  const status = useStatusNotice(unreachable);

  return (
    <>
      {status.notice ? <StatusNoticeBar notice={status.notice} onDismiss={status.dismiss} /> : null}
      <AuthPageShell>
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{t(WORDS[variant].title)}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{t(WORDS[variant].body)}</p>
        </div>

        <div className="mx-auto w-11/12 max-w-sm space-y-3 sm:w-full">
          {variant === "inactive" ? (
            <Button asChild className="w-full">
              <a href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "noreply@mail.paperbase.me"}`}>{tCommon("contactSupport")}</a>
            </Button>
          ) : (
            <Button type="button" className="w-full" onClick={() => window.location.reload()}>
              {unreachable ? tCommon("retry") : tCommon("reload")}
            </Button>
          )}
          {/* Signing out needs Accounts: not offered while it is the part away. */}
          {variant === "signInUnreachable" ? null : (
            <Button type="button" variant="outline" className="w-full" onClick={() => void signOut()}>
              {tCommon("signOut")}
            </Button>
          )}
        </div>
      </AuthPageShell>
    </>
  );
}
