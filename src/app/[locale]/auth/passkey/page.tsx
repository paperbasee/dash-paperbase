"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Fingerprint } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { AuthError, AuthHeading, AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { resolvePostAuthRoute } from "@/lib/subscription-access";
import { isNetworkError } from "@/lib/network-error";
import {
  browserSupportsWebAuthn,
  isPasskeyCancellation,
  platformAuthenticatorAvailable,
} from "@/lib/passkeys";

type Phase = "verifying" | "enroll" | "offer" | "error";

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

export default function MagicLinkPasskeyPage() {
  const t = useTranslations("auth.passkey");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { verifyMagicLink, enrollPasskey } = useAuth();

  const [phase, setPhase] = useState<Phase>("verifying");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [ticket, setTicket] = useState("");
  const verifiedRef = useRef(false);

  const goToDashboard = useCallback(async () => {
    const next = await resolvePostAuthRoute();
    router.push(next.ok ? next.path : "/");
  }, [router]);

  useEffect(() => {
    if (verifiedRef.current) return;
    verifiedRef.current = true;
    if (!token) {
      setPhase("error");
      setError(t("missingToken"));
      return;
    }
    void (async () => {
      try {
        const result = await verifyMagicLink(token);
        if (result.action === "signed_in") {
          // Signed in via the email link (the account already has a passkey, just
          // not on this device). Offer to add one here — optional, and only when
          // the device can make a platform passkey and hasn't dismissed the offer.
          const canOffer =
            !offerDismissedOnThisDevice() && (await platformAuthenticatorAvailable());
          if (canOffer) {
            setPhase("offer");
          } else {
            await goToDashboard();
          }
          return;
        }
        setTicket(result.enrollment_ticket);
        setEmail(result.email);
        setPhase("enroll");
      } catch (err: unknown) {
        setPhase("error");
        const res =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { detail?: unknown } } }).response
            : undefined;
        setError(typeof res?.data?.detail === "string" ? res.data.detail : t("invalid"));
      }
    })();
  }, [token, verifyMagicLink, goToDashboard, t]);

  async function handleEnroll() {
    setError("");
    if (!browserSupportsWebAuthn()) {
      setError(t("noSupport"));
      return;
    }
    setEnrolling(true);
    try {
      const result = await enrollPasskey({ enrollmentTicket: ticket });
      if (result.tokens) {
        await goToDashboard();
      } else {
        setError(t("finishFailed"));
      }
    } catch (err: unknown) {
      if (isPasskeyCancellation(err)) {
        setError(t("cancelled"));
        return;
      }
      if (isNetworkError(err)) {
        setError(tAuth("unreachable"));
        return;
      }
      setError(t("failed"));
    } finally {
      setEnrolling(false);
    }
  }

  // Optional, post-login enrollment on a device that signed in via the email link.
  // Uses the authenticated register flow (tokens are already stored), not a ticket.
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
      if (isPasskeyCancellation(err)) {
        setError(t("cancelledOffer"));
        return;
      }
      if (isNetworkError(err)) {
        setError(tAuth("unreachable"));
        return;
      }
      setError(t("failedOffer"));
    } finally {
      setEnrolling(false);
    }
  }

  function handleSkip() {
    rememberOfferDismissed();
    void goToDashboard();
  }

  if (phase === "verifying") {
    return (
      <AuthSplitShell showcase="signup">
        <div className="pb-stagger space-y-6" aria-busy>
          <AuthHeading title={t("verifyingTitle")} body={t("verifyingBody")} />
          <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        </div>
      </AuthSplitShell>
    );
  }

  if (phase === "error") {
    return (
      <AuthSplitShell showcase="signup">
        <div className="pb-stagger space-y-6">
          <AuthHeading title={t("errorTitle")} body={error} />
          <Button variant="outline" asChild className="h-11 w-full">
            <Link href="/login">{t("backToSignIn")}</Link>
          </Button>
        </div>
      </AuthSplitShell>
    );
  }

  if (phase === "offer") {
    return (
      <AuthSplitShell showcase="signin">
        <div className="pb-stagger space-y-6">
          <PasskeyMark />
          <AuthHeading title={t("offerTitle")} body={t("offerBody")} />
          {error ? <AuthError>{error}</AuthError> : null}
          <div className="space-y-3">
            <Button
              type="button"
              loading={enrolling}
              onClick={() => void handleOfferEnroll()}
              className="h-11 w-full"
            >
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
      </AuthSplitShell>
    );
  }

  return (
    <AuthSplitShell showcase="signup">
      <div className="pb-stagger space-y-6">
        <PasskeyMark />
        <AuthHeading title={t("enrollTitle")} body={t("enrollBody", { email })} />
        {error ? <AuthError>{error}</AuthError> : null}
        <Button
          type="button"
          loading={enrolling}
          onClick={() => void handleEnroll()}
          className="h-11 w-full"
        >
          <Fingerprint className="size-[18px]" aria-hidden />
          {t("create")}
        </Button>
      </div>
    </AuthSplitShell>
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
