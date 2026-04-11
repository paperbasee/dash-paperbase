"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Spinner } from "@/components/ui/spinner";
import {
  resendVerificationEmail,
  verifyEmailFromLink,
} from "@/lib/auth-email";
import { useRateLimitCooldown, extractRateLimitInfo } from "@/hooks/useRateLimitCooldown";
import { useMinDelayLoading } from "@/hooks/useMinDelayLoading";
import { remainingResendCooldownSeconds } from "@/lib/email-verification-resend-policy";
import {
  PENDING_VERIFICATION_EMAIL_KEY,
  clearPendingVerificationEmail,
  getPendingVerificationEmail,
  normalizeEmail,
  setPendingVerificationEmail,
} from "@/lib/verification-state";

function decodeEmailParam(value: string): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractMessage(err: unknown, generic: string): string {
  const res =
    err && typeof err === "object" && "response" in err
      ? (err as { response?: { data?: Record<string, unknown> } }).response
          ?.data
      : null;
  if (!res || typeof res !== "object") return generic;
  const msg = (v: unknown) =>
    Array.isArray(v) ? (v[0] as string) : typeof v === "string" ? v : null;
  return (
    msg(res.token) ??
    msg(res.uid) ??
    msg(res.detail) ??
    (typeof res === "object" && res !== null && "non_field_errors" in res
      ? msg((res as { non_field_errors?: unknown }).non_field_errors)
      : null) ??
    generic
  );
}

export default function VerifyEmailContent() {
  const t = useTranslations("auth.verifyEmail");
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";
  const emailParam = searchParams.get("email") ?? "";
  const signupTimeRaw = searchParams.get("signup_time") ?? "";
  const decodedEmail = decodeEmailParam(emailParam);

  const [linkStatus, setLinkStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [linkMessage, setLinkMessage] = useState("");

  const [pendingEmail, setPendingEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const { loading: resendLoading, runWithLoading } = useMinDelayLoading();
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState("");
  const {
    isLimited: cooldownLimited,
    remaining: cooldownRemaining,
    startCooldown,
    mergeCooldownFromSeconds,
  } = useRateLimitCooldown();

  const isFromEmailLink = Boolean(uid && token);
  const signupTimeMs = Number(signupTimeRaw);
  const hasValidSignupTime =
    signupTimeRaw !== "" &&
    Number.isFinite(signupTimeMs) &&
    signupTimeMs > 0;
  const effectiveEmail = pendingEmail || normalizeEmail(decodedEmail) || normalizeEmail(emailInput);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedEmail = getPendingVerificationEmail();
    const queryEmail = normalizeEmail(decodedEmail);

    if (queryEmail) {
      setPendingVerificationEmail(queryEmail);
    }

    setPendingEmail(storedEmail || queryEmail);
  }, [decodedEmail]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== PENDING_VERIFICATION_EMAIL_KEY) return;
      const nextEmail = getPendingVerificationEmail();
      setPendingEmail(nextEmail);
      if (!nextEmail) {
        setResendSuccess(false);
        setResendError("");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!isFromEmailLink) return;
    const doneKey = `email_verify_done_${uid}_${token}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(doneKey)) {
      clearPendingVerificationEmail();
      setLinkStatus("success");
      setLinkMessage(t("verifiedDefault"));
      return;
    }
    setLinkStatus("loading");
    verifyEmailFromLink(uid, token)
      .then((data) => {
        sessionStorage.setItem(doneKey, "1");
        clearPendingVerificationEmail();
        setLinkStatus("success");
        setLinkMessage(
          typeof data?.detail === "string"
            ? data.detail
            : t("verifiedDefault")
        );
      })
      .catch((err: unknown) => {
        setLinkStatus("error");
        setLinkMessage(extractMessage(err, t("genericError")));
      });
  }, [isFromEmailLink, uid, token, t]);

  useEffect(() => {
    if (isFromEmailLink || !hasValidSignupTime) return;
    const remaining = remainingResendCooldownSeconds(signupTimeMs);
    if (remaining > 0) {
      // Replace (not merge): deadline must match URL signup_time. mergeCooldownFromSeconds
      // is for 429 only — merging here could fight Strict Mode / stale refs.
      startCooldown(remaining);
    }
  }, [
    isFromEmailLink,
    hasValidSignupTime,
    signupTimeRaw,
    signupTimeMs,
    startCooldown,
  ]);

  async function handleResend() {
    const resendEmail = effectiveEmail || normalizeEmail(emailInput);
    if (!resendEmail) {
      setResendError(t("emailRequiredResend"));
      return;
    }
    setPendingVerificationEmail(resendEmail);
    setPendingEmail(resendEmail);
    setResendError("");
    setResendSuccess(false);
    try {
      await runWithLoading(async () => {
        await resendVerificationEmail(resendEmail);
        setResendSuccess(true);
      });
    } catch (err: unknown) {
      const info = extractRateLimitInfo(err);
      if (info) {
        mergeCooldownFromSeconds(info.retryAfter);
        setResendError("");
      } else {
        setResendError(extractMessage(err, t("genericError")));
      }
    }
  }

  if (isFromEmailLink) {
    if (linkStatus === "loading" || linkStatus === "idle") {
      return (
        <div className="mx-auto w-11/12 max-w-sm text-center text-sm text-muted-foreground sm:w-full">
          <div className="inline-flex items-center gap-2">
            <Spinner />
            <span>{t("verifying")}</span>
          </div>
        </div>
      );
    }
    if (linkStatus === "success") {
      return (
        <div className="space-y-8 sm:space-y-10">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t("verifiedTitle")}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {linkMessage}
            </p>
          </div>

          <div className="mx-auto w-11/12 max-w-sm space-y-6 sm:w-full">
            <Button asChild className="mt-2 w-full">
              <Link href="/login">{t("logIn")}</Link>
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-8 sm:space-y-10">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t("failedTitle")}
          </h1>
          <p className="text-sm leading-relaxed text-destructive">{linkMessage}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("failedHint")}</p>
        </div>

        <div className="mx-auto w-11/12 max-w-sm space-y-6 sm:w-full">
          <Button asChild variant="outline" className="mt-2 w-full">
            <Link href="/login">{t("backToLogin")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t("checkTitle")}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("checkBody")}</p>
      </div>

      <div className="mx-auto w-11/12 max-w-sm space-y-6 sm:w-full">
        {effectiveEmail ? (
          <p className="rounded-ui border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
            {effectiveEmail}
          </p>
        ) : (
          <div className="space-y-2">
            <Input
              type="email"
              autoComplete="email"
              size="lg"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder={t("emailPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("emailHint")}</p>
          </div>
        )}

        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("resendHint")}
        </p>

        {resendSuccess && (
          <div className="rounded-ui border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
            {t("resendSuccess")}
          </div>
        )}
        {resendError ? (
          <div className="rounded-ui border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {resendError}
          </div>
        ) : null}

        <LoadingButton
          type="button"
          className="mt-2 w-full"
          disabled={cooldownLimited || resendLoading}
          isLoading={resendLoading}
          loadingText={t("sending")}
          onClick={handleResend}
        >
          {cooldownLimited
            ? t("resendAvailableInSeconds", { seconds: cooldownRemaining })
            : t("resendEmail")}
        </LoadingButton>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("backToLogin")}
        </Link>
      </p>
    </div>
  );
}
