"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  resendVerificationEmail,
  verifyEmailFromLink,
} from "@/lib/auth-email";

function extractMessage(err: unknown): string {
  const res =
    err && typeof err === "object" && "response" in err
      ? (err as { response?: { data?: Record<string, unknown> } }).response
          ?.data
      : null;
  if (!res || typeof res !== "object") return "Something went wrong. Please try again.";
  const msg = (v: unknown) =>
    Array.isArray(v) ? (v[0] as string) : typeof v === "string" ? v : null;
  return (
    msg(res.token) ??
    msg(res.uid) ??
    msg(res.detail) ??
    (typeof res === "object" && res !== null && "non_field_errors" in res
      ? msg((res as { non_field_errors?: unknown }).non_field_errors)
      : null) ??
    "Something went wrong. Please try again."
  );
}

export default function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";
  const emailParam = searchParams.get("email") ?? "";

  const [linkStatus, setLinkStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [linkMessage, setLinkMessage] = useState("");

  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState("");

  const isFromEmailLink = Boolean(uid && token);

  useEffect(() => {
    if (!isFromEmailLink) return;
    const doneKey = `email_verify_done_${uid}_${token}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(doneKey)) {
      setLinkStatus("success");
      setLinkMessage("Email verified successfully.");
      return;
    }
    setLinkStatus("loading");
    verifyEmailFromLink(uid, token)
      .then((data) => {
        sessionStorage.setItem(doneKey, "1");
        setLinkStatus("success");
        setLinkMessage(
          typeof data?.detail === "string"
            ? data.detail
            : "Email verified successfully."
        );
      })
      .catch((err: unknown) => {
        setLinkStatus("error");
        setLinkMessage(extractMessage(err));
      });
  }, [isFromEmailLink, uid, token]);

  async function handleResend() {
    setResendError("");
    setResendSuccess(false);
    setResendLoading(true);
    try {
      await resendVerificationEmail();
      setResendSuccess(true);
    } catch (err: unknown) {
      setResendError(extractMessage(err));
    } finally {
      setResendLoading(false);
    }
  }

  if (isFromEmailLink) {
    if (linkStatus === "loading" || linkStatus === "idle") {
      return (
        <div className="mx-auto w-11/12 max-w-sm text-center text-sm text-muted-foreground sm:w-full">
          Verifying your email…
        </div>
      );
    }
    if (linkStatus === "success") {
      return (
        <div className="space-y-8 sm:space-y-10">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Email verified
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {linkMessage}
            </p>
          </div>

          <div className="mx-auto w-11/12 max-w-sm space-y-6 sm:w-full">
            <Button asChild className="mt-2 w-full">
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-8 sm:space-y-10">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Verification failed
          </h1>
          <p className="text-sm leading-relaxed text-destructive">{linkMessage}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Request a new link from the signup flow or contact support.
          </p>
        </div>

        <div className="mx-auto w-11/12 max-w-sm space-y-6 sm:w-full">
          <Button asChild variant="outline" className="mt-2 w-full">
            <Link href="/login">Back to login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Check your email
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We&apos;ve sent a verification link to your email address. Please check your
          inbox.
        </p>
      </div>

      <div className="mx-auto w-11/12 max-w-sm space-y-6 sm:w-full">
        {emailParam ? (
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
            {(() => {
              try {
                return decodeURIComponent(emailParam);
              } catch {
                return emailParam;
              }
            })()}
          </p>
        ) : null}

        <p className="text-sm leading-relaxed text-muted-foreground">
          Didn&apos;t receive the email? Check spam or resend.
        </p>

        {resendSuccess && (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
            Verification email sent again.
          </div>
        )}
        {resendError ? (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {resendError}
          </div>
        ) : null}

        <Button
          type="button"
          className="mt-2 w-full"
          disabled={resendLoading}
          onClick={handleResend}
        >
          {resendLoading ? "Sending…" : "Resend email"}
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to login
        </Link>
      </p>
    </div>
  );
}
