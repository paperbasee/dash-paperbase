"use client";

import { Check, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import type { MagicLinkVerifyResult } from "@/lib/auth";
import { isNetworkError } from "@/lib/network-error";

import { AuthDivider, AuthHeading } from "./AuthParts";
import { CodeInput } from "./CodeInput";
import { MagicOutcome } from "./MagicOutcome";

/** Seconds before the link may be sent again; the API throttles on its own too. */
const RESEND_AFTER = 30;

const MAILBOXES = [
  { key: "openGmail", href: "https://mail.google.com/" },
  { key: "openOutlook", href: "https://outlook.live.com/mail/" },
] as const;

/**
 * "Check your email", after a sign-in link or a sign-up. Both send the same kind of link -- one
 * that signs in, or walks a new account through making its passkey -- so sending it again is the
 * same request either way.
 *
 * The email also carries a six-digit code (2026-09-29): typed here, it does what the link does, so
 * an owner who opened the email on their phone carries on on this screen (MagicOutcome).
 */
export function CheckEmailPanel({
  email,
  variant,
  onBack,
}: {
  email: string;
  variant: "signin" | "signup";
  onBack: () => void;
}) {
  const t = useTranslations("auth.checkEmail");
  const { requestMagicLink, verifyMagicCode } = useAuth();
  const [wait, setWait] = useState(RESEND_AFTER);
  const [resent, setResent] = useState(false);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [codeError, setCodeError] = useState<"wrong" | "locked" | "unreachable" | null>(null);
  const [tries, setTries] = useState(0);
  const [outcome, setOutcome] = useState<MagicLinkVerifyResult | null>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  async function resend() {
    setWait(RESEND_AFTER);
    setCode("");
    setCodeError(null);
    try {
      await requestMagicLink(email, "login");
      setResent(true);
    } catch {
      // Throttled or unreachable: the countdown gives it time; nothing to add.
    }
  }

  async function check(typed: string) {
    setChecking(true);
    setCodeError(null);
    try {
      setOutcome(await verifyMagicCode(email, typed));
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { code?: unknown } } }).response?.data?.code
          : undefined;
      setCodeError(isNetworkError(err) ? "unreachable" : code === "code_locked" ? "locked" : "wrong");
      setTries((n) => n + 1);
      setCode("");
    } finally {
      setChecking(false);
    }
  }

  // The code is in: carry on exactly as the link would have.
  if (outcome) return <MagicOutcome result={outcome} />;

  return (
    <div className="pb-stagger space-y-6">
      <span className="pb-pop relative flex size-16 items-center justify-center rounded-card border border-[#e6e1d8] bg-[#f3f1ec] text-foreground dark:border-border dark:bg-muted">
        <Mail className="size-7" strokeWidth={1.6} aria-hidden />
        <span className="absolute -right-2 -top-2 flex size-[22px] items-center justify-center rounded-full bg-[hsl(var(--accent-green))] text-white">
          <Check className="size-3.5" aria-hidden />
        </span>
      </span>
      <AuthHeading title={t("title")} body={t(variant === "signin" ? "signinBody" : "signupBody", { email })} />
      <div className="grid grid-cols-2 gap-2.5">
        {MAILBOXES.map((box) => (
          <Button key={box.key} variant="outline" asChild className="h-11">
            <a href={box.href} target="_blank" rel="noopener noreferrer">
              {t(box.key)}
            </a>
          </Button>
        ))}
      </div>
      <div className="space-y-3">
        <AuthDivider>{t("orCode")}</AuthDivider>
        <CodeInput
          value={code}
          onChange={(next) => {
            setCode(next);
            if (codeError === "wrong") setCodeError(null);
          }}
          onComplete={(typed) => void check(typed)}
          label={t("codeLabel")}
          invalid={codeError === "wrong" || codeError === "locked"}
          shakeKey={tries}
          busy={checking}
          disabled={codeError === "locked"}
        />
        <p role={codeError ? "alert" : "status"} aria-live="polite" className="min-h-5 text-[13px]">
          {checking ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-border border-t-foreground" aria-hidden />
              {t("checking")}
            </span>
          ) : codeError === "wrong" ? (
            <span className="text-destructive">{t("codeWrong")}</span>
          ) : codeError === "locked" ? (
            <span className="text-destructive">{t("codeLocked")}</span>
          ) : codeError === "unreachable" ? (
            <span className="text-destructive">{t("codeUnreachable")}</span>
          ) : null}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        {resent ? `${t("resent")} ` : `${t("noEmail")} `}
        {wait > 0 ? (
          <span className="tabular-nums">{t("resendIn", { seconds: wait })}</span>
        ) : (
          <button
            type="button"
            onClick={() => void resend()}
            className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            {t("resend")}
          </button>
        )}
      </p>
      <p className="text-sm text-muted-foreground">
        {t("wrongEmail")}{" "}
        <button
          type="button"
          onClick={onBack}
          className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
        >
          {t("goBack")}
        </button>
      </p>
    </div>
  );
}
