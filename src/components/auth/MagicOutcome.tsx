"use client";

import { Fingerprint } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "@/i18n/navigation";
import type { MagicLinkVerifyResult } from "@/lib/auth";
import { isNetworkError } from "@/lib/network-error";
import { browserSupportsWebAuthn, isPasskeyCancellation, platformAuthenticatorAvailable } from "@/lib/passkeys";
import { resolvePostAuthRoute } from "@/lib/subscription-access";

import { AuthError, AuthHeading } from "./AuthParts";

// Per-device "don't offer again" flag for the post-login passkey nudge.
const PASSKEY_OFFER_DISMISSED_KEY = "pb_passkey_device_offer_dismissed";

function offerDismissedOnThisDevice(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PASSKEY_OFFER_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberOfferDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PASSKEY_OFFER_DISMISSED_KEY, "1");
  } catch {
    /* storage unavailable (private mode) — non-fatal */
  }
}

/**
 * What an email's link -- or the code beside it (2026-09-29) -- leads to, once the API has taken
 * it: a new account makes its passkey; an account that has one is in, and is offered one for this
 * device when it can make one. The link's page and the "Check your email" panel both end here, so
 * a typed code carries on exactly as a clicked link does.
 */
export function MagicOutcome({ result }: { result: MagicLinkVerifyResult }) {
  const t = useTranslations("auth.passkey");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const { enrollPasskey } = useAuth();
  const [phase, setPhase] = useState<"deciding" | "enroll" | "offer">(
    result.action === "enroll_passkey" ? "enroll" : "deciding"
  );
  const [error, setError] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const decided = useRef(false);

  const goToDashboard = useCallback(async () => {
    const next = await resolvePostAuthRoute();
    router.push(next.ok ? next.path : "/");
  }, [router]);

  useEffect(() => {
    if (result.action !== "signed_in" || decided.current) return;
    decided.current = true;
    void (async () => {
      // Signed in by email (the account already has a passkey, just not on this device). Offer to
      // add one here -- optional, and only when the device can make a platform passkey and hasn't
      // said no before.
      const canOffer = !offerDismissedOnThisDevice() && (await platformAuthenticatorAvailable());
      if (canOffer) setPhase("offer");
      else await goToDashboard();
    })();
  }, [result.action, goToDashboard]);

  async function handleEnroll() {
    if (result.action !== "enroll_passkey") return;
    setError("");
    if (!browserSupportsWebAuthn()) {
      setError(t("noSupport"));
      return;
    }
    setEnrolling(true);
    try {
      const done = await enrollPasskey({ enrollmentTicket: result.enrollment_ticket });
      if (done.tokens) await goToDashboard();
      else setError(t("finishFailed"));
    } catch (err: unknown) {
      if (isPasskeyCancellation(err)) setError(t("cancelled"));
      else if (isNetworkError(err)) setError(tAuth("unreachable"));
      else setError(t("failed"));
    } finally {
      setEnrolling(false);
    }
  }

  // Optional, post-login enrollment on a device that signed in by email. Uses the authenticated
  // register flow (tokens are already stored), not a ticket.
  async function handleOfferEnroll() {
    setError("");
    if (!browserSupportsWebAuthn()) {
      handleSkip();
      return;
    }
    setEnrolling(true);
    try {
      await enrollPasskey({});
      await goToDashboard();
    } catch (err: unknown) {
      if (isPasskeyCancellation(err)) setError(t("cancelledOffer"));
      else if (isNetworkError(err)) setError(tAuth("unreachable"));
      else setError(t("failedOffer"));
    } finally {
      setEnrolling(false);
    }
  }

  function handleSkip() {
    rememberOfferDismissed();
    void goToDashboard();
  }

  if (phase === "deciding") {
    return (
      <div className="pb-stagger space-y-6" aria-busy>
        <AuthHeading title={t("verifyingTitle")} body={t("verifyingBody")} />
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  if (phase === "offer") {
    return (
      <div className="pb-stagger space-y-6">
        <PasskeyMark />
        <AuthHeading title={t("offerTitle")} body={t("offerBody")} />
        {error ? <AuthError>{error}</AuthError> : null}
        <div className="space-y-3">
          <Button type="button" loading={enrolling} onClick={() => void handleOfferEnroll()} className="h-11 w-full">
            <Fingerprint className="size-[18px]" aria-hidden />
            {t("create")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            disabled={enrolling}
            className="h-11 w-full text-muted-foreground"
          >
            {t("notNow")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-stagger space-y-6">
      <PasskeyMark />
      <AuthHeading
        title={t("enrollTitle")}
        body={t("enrollBody", { email: result.action === "enroll_passkey" ? result.email : "" })}
      />
      {error ? <AuthError>{error}</AuthError> : null}
      <Button type="button" loading={enrolling} onClick={() => void handleEnroll()} className="h-11 w-full">
        <Fingerprint className="size-[18px]" aria-hidden />
        {t("create")}
      </Button>
    </div>
  );
}

/** The fingerprint, with a ring that goes out from it twice. */
function PasskeyMark() {
  return (
    <span className="pb-pop pb-ring inline-flex rounded-full text-foreground">
      <span className="flex size-14 items-center justify-center rounded-full bg-foreground text-background">
        <Fingerprint className="size-7" strokeWidth={1.6} aria-hidden />
      </span>
    </span>
  );
}
