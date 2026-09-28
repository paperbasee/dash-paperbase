"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { AuthHeading } from "@/components/auth/AuthParts";
import { MagicOutcome } from "@/components/auth/MagicOutcome";
import type { MagicLinkVerifyResult } from "@/lib/auth";

/**
 * Where an email's link lands: it is taken once, then carries on to MagicOutcome -- a passkey to
 * make, or the dashboard -- as the code typed on "Check your email" does.
 */
export default function MagicLinkPasskeyPage() {
  const t = useTranslations("auth.passkey");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { verifyMagicLink } = useAuth();

  const [result, setResult] = useState<MagicLinkVerifyResult | null>(null);
  const [error, setError] = useState("");
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (verifiedRef.current) return;
    verifiedRef.current = true;
    if (!token) {
      setError(t("missingToken"));
      return;
    }
    void (async () => {
      try {
        setResult(await verifyMagicLink(token));
      } catch (err: unknown) {
        const res =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { detail?: unknown } } }).response
            : undefined;
        setError(typeof res?.data?.detail === "string" ? res.data.detail : t("invalid"));
      }
    })();
  }, [token, verifyMagicLink, t]);

  if (error) {
    return (
      <div className="pb-stagger space-y-6">
        <AuthHeading title={t("errorTitle")} body={error} />
        <Button variant="outline" asChild className="h-11 w-full">
          <Link href="/login">{t("backToSignIn")}</Link>
        </Button>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="pb-stagger space-y-6" aria-busy>
        <AuthHeading title={t("verifyingTitle")} body={t("verifyingBody")} />
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  return <MagicOutcome result={result} />;
}
