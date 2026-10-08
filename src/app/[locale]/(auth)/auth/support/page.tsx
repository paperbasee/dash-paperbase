"use client";

import { LifeBuoy } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { AuthHeading } from "@/components/auth/AuthParts";
import { supportVisitUrl } from "@/lib/accounts/sign-in";

/**
 * Where "Sign in as this shop" in Django admin lands (owner, 2026-09-29): the admin's one-time
 * ticket goes on to Accounts, which starts the support sign-in -- the shop's owner, with support
 * acting -- and comes back through the usual return (auth/callback) into the shop's dashboard.
 * A ticket that does not work, and the end of the visit, are Accounts' pages.
 */
export default function SupportVisitPage() {
  const t = useTranslations("auth.support");
  const locale = useLocale();
  const ticket = useSearchParams().get("ticket") ?? "";
  const started = useRef(false);

  useEffect(() => {
    if (!ticket || started.current) return;
    started.current = true;
    void supportVisitUrl(ticket, locale).then((url) => window.location.replace(url));
  }, [ticket, locale]);

  return (
    <div className="pb-stagger space-y-6" aria-busy={Boolean(ticket)}>
      <span className="flex size-14 items-center justify-center rounded-full bg-amber-400 text-amber-950">
        <LifeBuoy className="size-7" strokeWidth={1.6} aria-hidden />
      </span>
      {ticket ? (
        <>
          <AuthHeading title={t("enteringTitle")} body={t("enteringBody")} />
          <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        </>
      ) : (
        <AuthHeading title={t("failedTitle")} body={t("missing")} />
      )}
    </div>
  );
}
