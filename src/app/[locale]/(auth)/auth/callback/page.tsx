"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { AuthError, AuthHeading } from "@/components/auth/AuthParts";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Link, useRouter } from "@/i18n/navigation";
import { finishSignIn, type SignInFailure } from "@/lib/accounts/sign-in";
import { pathAfterSignIn, resolvePostAuthRoute } from "@/lib/subscription-access";

/**
 * Where Accounts sends people back after signing in or up (`<DASHBOARD_URL>/auth/callback`, the
 * address registered for the dashboard): the one-time code is traded for the pass (lib/accounts/
 * sign-in), and the dashboard opens where they were going -- or, with nowhere asked, setup for a
 * new person and the dashboard for everyone else.
 */
export default function SignInCallbackPage() {
  const t = useTranslations("auth.callback");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const { completeSignIn } = useAuth();
  const [failure, setFailure] = useState<SignInFailure | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      const result = await finishSignIn(new URLSearchParams(window.location.search));
      // The code is spent either way: it leaves the address bar.
      window.history.replaceState(null, "", window.location.pathname);
      if (!result.ok) {
        setFailure(result.failure);
        return;
      }
      completeSignIn(result.pass);
      if (result.next) {
        router.replace(result.next);
        return;
      }
      const path = pathAfterSignIn(await resolvePostAuthRoute());
      if (path) {
        router.replace(path);
      } else {
        setFailure("unreachable");
      }
    })();
  }, [completeSignIn, router]);

  if (failure) {
    return (
      <div className="pb-stagger space-y-6">
        <AuthHeading title={t("failedTitle")} body={failure === "unreachable" ? undefined : t("failedBody")} />
        {failure === "unreachable" ? <AuthError>{tAuth("unreachable")}</AuthError> : null}
        <Button asChild className="h-11 w-full">
          <Link href="/login">{t("again")}</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="pb-stagger space-y-6" aria-busy>
      <AuthHeading title={t("title")} />
      <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
    </div>
  );
}
