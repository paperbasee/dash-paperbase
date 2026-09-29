"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Check, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useHideAuthTabs } from "@/components/auth/AuthFrame";
import { AuthError } from "@/components/auth/AuthParts";
import { CheckEmailPanel } from "@/components/auth/CheckEmailPanel";
import { EmailTypoHint, useEmailTypo } from "@/components/auth/EmailTypoHint";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { useMinDelayLoading } from "@/hooks/useMinDelayLoading";
import { isTurnstileDisabled } from "@/lib/turnstile-env";
import { isNetworkError } from "@/lib/network-error";
import { toLocaleDigits } from "@/lib/locale-digits";
import { trialOfferQueryKey } from "@/lib/query-keys";
import { fetchTrialDays } from "@/lib/trial";

export default function SignupPage() {
  const t = useTranslations("auth.signup");
  const tAuth = useTranslations("auth");
  const { signup } = useAuth();

  const [email, setEmail] = useState("");
  const typo = useEmailTypo(email, setEmail);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const { loading, runWithLoading } = useMinDelayLoading();
  useHideAuthTabs(sent);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    // Setup never asks again: the shop's owner name is the account's (POST /store/).
    if (!firstName.trim() || !lastName.trim()) {
      setError(t("nameRequired"));
      return;
    }
    if (!email.trim()) {
      setError(t("emailRequired"));
      return;
    }
    if (typo.hold()) return;
    const formEl = e.currentTarget;
    if (!(formEl instanceof HTMLFormElement)) return;
    const turnstileToken =
      (new FormData(formEl).get("cf-turnstile-response") as string | null)?.trim() ?? "";
    if (!isTurnstileDisabled() && !turnstileToken) {
      setError(tAuth("turnstileRequired"));
      return;
    }

    try {
      await runWithLoading(async () => {
        await signup(email, firstName.trim(), lastName.trim(), turnstileToken);
        setSent(true);
      });
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        setError(tAuth("unreachable"));
        return;
      }
      const res =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { status?: number; data?: { email?: unknown; detail?: unknown } } }).response
          : undefined;
      const emailErr = Array.isArray(res?.data?.email) ? res?.data?.email[0] : res?.data?.email;
      setError(typeof emailErr === "string" ? emailErr : t("failed"));
    }
  }

  return (
    <>
      {sent ? (
        <CheckEmailPanel email={email.trim()} variant="signup" onBack={() => setSent(false)} />
      ) : (
        <form onSubmit={handleSubmit} className="pb-stagger space-y-6" aria-busy={loading} noValidate>
          {error ? <AuthError>{error}</AuthError> : null}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="form-field">
                <label htmlFor="first_name" className="field-label">
                  {t("firstName")}
                </label>
                <Input
                  id="first_name"
                  size="lg"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t("firstNamePlaceholder")}
                  autoComplete="given-name"
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="last_name" className="field-label">
                  {t("lastName")}
                </label>
                <Input
                  id="last_name"
                  size="lg"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t("lastNamePlaceholder")}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="email" className="field-label">
                {t("email")}
              </label>
              <Input
                id="email"
                type="email"
                required
                size="lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={typo.reveal}
                placeholder={t("emailPlaceholder")}
                autoComplete="email"
                inputMode="email"
              />
              <EmailTypoHint typo={typo} />
            </div>

            <TurnstileWidget />

            <Button type="submit" loading={loading} className="h-11 w-full">
              <Mail className="size-[18px]" aria-hidden />
              {t("create")}
            </Button>
            <TrialPromise />
          </div>
        </form>
      )}
    </>
  );
}

/**
 * "Free for 7 days · No payment to start" under Create account (owner, 2026-09-29): the trial the
 * API says a new shop gets -- never a number written here -- and nothing when there is none.
 */
function TrialPromise() {
  const t = useTranslations("auth.signup");
  const locale = useLocale();
  const { data: days, isPending } = useQuery({
    queryKey: trialOfferQueryKey,
    queryFn: fetchTrialDays,
    staleTime: 30 * 60_000,
  });
  // Its line is held while it is asked, so the page does not move when it comes.
  if (isPending) return <div className="h-4" aria-hidden />;
  if (!days) return null;
  const item = "flex items-center gap-1.5";
  const tick = <Check className="size-3.5 text-[hsl(var(--accent-green))]" strokeWidth={2.5} aria-hidden />;
  return (
    <ul className="pb-rise flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <li className={item}>
        {tick}
        {toLocaleDigits(t("trialFree", { days }), locale)}
      </li>
      <li className={item}>
        {tick}
        {t("trialNoPayment")}
      </li>
    </ul>
  );
}
