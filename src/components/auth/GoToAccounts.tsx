"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AuthError, AuthHeading } from "@/components/auth/AuthParts";
import { accountsUrl } from "@/lib/accounts/config";
import { authorizeUrl } from "@/lib/accounts/sign-in";
import { getSafeNextPath } from "@/lib/safe-next";
import { isSignInEndReason } from "@/lib/sign-in-ended";

/**
 * The dashboard's Sign in and Create account (`/login`, `/signup`): on to Accounts, where people
 * sign in and up (guidelines/accounts-plan.md, section 7), carrying where to go after (`next`),
 * why the last sign-in ended (`ended`, which Accounts' page says) and the dashboard's language.
 */
export function GoToAccounts({ prompt }: { prompt?: "create" }) {
  const t = useTranslations("auth.toAccounts");
  const tAuth = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [missing, setMissing] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!accountsUrl()) {
      setMissing(true);
      return;
    }
    const ended = searchParams.get("ended");
    void authorizeUrl({
      next: getSafeNextPath(searchParams.get("next")),
      ended: isSignInEndReason(ended) ? ended : null,
      prompt,
      locale,
    }).then((url) => window.location.replace(url));
  }, [searchParams, prompt, locale]);

  return (
    <div className="pb-stagger space-y-6" aria-busy={!missing}>
      <AuthHeading title={t(prompt ? "signUpTitle" : "signInTitle")} body={t("body")} />
      {missing ? (
        <AuthError>{tAuth("unreachable")}</AuthError>
      ) : (
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      )}
    </div>
  );
}
