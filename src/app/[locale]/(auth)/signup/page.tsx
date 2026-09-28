"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useHideAuthTabs } from "@/components/auth/AuthFrame";
import { AuthError, AuthHeading } from "@/components/auth/AuthParts";
import { CheckEmailPanel } from "@/components/auth/CheckEmailPanel";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { useMinDelayLoading } from "@/hooks/useMinDelayLoading";
import { isTurnstileDisabled } from "@/lib/turnstile-env";
import { isNetworkError } from "@/lib/network-error";

export default function SignupPage() {
  const t = useTranslations("auth.signup");
  const tAuth = useTranslations("auth");
  const { signup } = useAuth();

  const [email, setEmail] = useState("");
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
          <AuthHeading title={t("title")} body={t("subtitle")} />
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
                placeholder={t("emailPlaceholder")}
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <TurnstileWidget />

            <Button type="submit" loading={loading} className="h-11 w-full">
              {t("create")}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
