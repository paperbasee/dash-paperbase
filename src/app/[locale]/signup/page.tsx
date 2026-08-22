"use client";

import { useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { MailSentIllustration } from "@/components/auth/MailSentIllustration";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { useMinDelayLoading } from "@/hooks/useMinDelayLoading";
import { getSafeNextPath, withNext } from "@/lib/safe-next";
import { isTurnstileDisabled } from "@/lib/turnstile-env";
import { isNetworkError } from "@/lib/network-error";

export default function SignupPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const searchParams = useSearchParams();
  const nextPath = getSafeNextPath(searchParams.get("next"));
  const { signup } = useAuth();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const { loading, runWithLoading } = useMinDelayLoading();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    const formEl = e.currentTarget;
    if (!(formEl instanceof HTMLFormElement)) return;
    const turnstileToken =
      (new FormData(formEl).get("cf-turnstile-response") as string | null)?.trim() ?? "";
    if (!isTurnstileDisabled() && !turnstileToken) {
      setError("Please complete the verification challenge.");
      return;
    }

    try {
      await runWithLoading(async () => {
        await signup(email, firstName, lastName, turnstileToken);
        setSent(true);
      });
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        setError("We couldn't reach the server. Please try again.");
        return;
      }
      const res =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { status?: number; data?: { email?: unknown; detail?: unknown } } }).response
          : undefined;
      const emailErr = Array.isArray(res?.data?.email) ? res?.data?.email[0] : res?.data?.email;
      if (typeof emailErr === "string") {
        setError(emailErr);
        return;
      }
      setError("We couldn't create your account. Please try again.");
    }
  }

  if (sent) {
    return (
      <AuthPageShell containerClassName="space-y-8">
        <div className="mx-auto w-11/12 max-w-sm space-y-3 text-center sm:w-full">
          <MailSentIllustration className="-mt-1" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Check your email
          </h1>
          <p className="mx-auto max-w-[34ch] text-sm leading-relaxed text-muted-foreground">
            We&apos;ve sent a link to{" "}
            <span className="font-medium text-foreground">{email}</span>. Open it to
            confirm your email and create your passkey — no password needed.
          </p>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      headline="Create your account"
      description="No password — you'll sign in with a passkey."
      containerClassName="space-y-8 sm:space-y-10"
    >
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="mx-auto w-11/12 max-w-sm space-y-6 sm:w-full"
        aria-busy={loading}
      >
        {error && (
          <div className="rounded-ui border border-destructive/20 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="form-field">
            <label htmlFor="first_name" className="field-label">
              First name
            </label>
            <Input
              id="first_name"
              size="lg"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jane"
              autoComplete="given-name"
            />
          </div>
          <div className="form-field">
            <label htmlFor="last_name" className="field-label">
              Last name
            </label>
            <Input
              id="last_name"
              size="lg"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              autoComplete="family-name"
            />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="email" className="field-label">
            Email
          </label>
          <Input
            id="email"
            type="email"
            required
            size="lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
          />
        </div>

        <TurnstileWidget />

        <Button type="submit" loading={loading} className="w-full">
          Continue
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={withNext("/login", nextPath)}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthPageShell>
  );
}
