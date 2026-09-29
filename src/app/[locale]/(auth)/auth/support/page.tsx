"use client";

import { LifeBuoy } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { AuthHeading } from "@/components/auth/AuthParts";
import { isApiHttpError } from "@/lib/api-client";
import { enterSupportSession } from "@/lib/auth";
import { isNetworkError } from "@/lib/network-error";

/**
 * Where "Sign in as this shop" in Django admin lands (owner, 2026-09-29): the admin's one-time
 * ticket is traded for the support session's tokens, and the shop's dashboard opens -- a full
 * load, so every part of it starts from this sign-in. The ticket leaves the address bar with it.
 * `?ended=1` is where the session's "End session" comes back to.
 */
export default function SupportSessionPage() {
  const t = useTranslations("auth.support");
  const tAuth = useTranslations("auth");
  const searchParams = useSearchParams();
  const ticket = searchParams.get("ticket") ?? "";
  const ended = searchParams.get("ended") === "1";
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (ended || started.current) return;
    started.current = true;
    if (!ticket) {
      setError(t("missing"));
      return;
    }
    void (async () => {
      try {
        await enterSupportSession(ticket);
        window.location.replace("/");
      } catch (err) {
        const detail =
          isApiHttpError(err) && err.data && typeof err.data === "object" && "detail" in err.data
            ? (err.data as { detail?: unknown }).detail
            : null;
        setError(isNetworkError(err) ? tAuth("unreachable") : typeof detail === "string" ? detail : t("failed"));
      }
    })();
  }, [ended, ticket, t, tAuth]);

  if (ended) {
    return (
      <div className="pb-stagger space-y-6">
        <SupportMark />
        <AuthHeading title={t("endedTitle")} body={t("endedBody")} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="pb-stagger space-y-6">
        <SupportMark />
        <AuthHeading title={t("failedTitle")} body={error} />
      </div>
    );
  }
  return (
    <div className="pb-stagger space-y-6" aria-busy>
      <SupportMark />
      <AuthHeading title={t("enteringTitle")} body={t("enteringBody")} />
      <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
    </div>
  );
}

function SupportMark() {
  return (
    <span className="flex size-14 items-center justify-center rounded-full bg-amber-400 text-amber-950">
      <LifeBuoy className="size-7" strokeWidth={1.6} aria-hidden />
    </span>
  );
}
