"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { KeyRound, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { MailSentIllustration } from "@/components/auth/MailSentIllustration";
import { useMinDelayLoading } from "@/hooks/useMinDelayLoading";
import { resolvePostAuthRoute } from "@/lib/subscription-access";
import { getSafeNextPath, withNext } from "@/lib/safe-next";
import { isNetworkError } from "@/lib/network-error";
import { browserSupportsWebAuthn, isPasskeyCancellation } from "@/lib/passkeys";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeNextPath(searchParams.get("next"));
  const { signInWithPasskey, requestMagicLink } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [supportsPasskeys, setSupportsPasskeys] = useState(true);
  const [linkSent, setLinkSent] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const { loading, runWithLoading } = useMinDelayLoading();

  useEffect(() => {
    setSupportsPasskeys(browserSupportsWebAuthn());
  }, []);

  async function redirectAfterAuth() {
    if (nextPath) {
      router.push(nextPath);
      return;
    }
    const next = await resolvePostAuthRoute();
    if (next.ok) {
      router.push(next.path);
    } else {
      setError(
        next.kind === "network_error"
          ? "We couldn't reach the server. Please try again."
          : "We couldn't verify your subscription. Please try again."
      );
    }
  }

  // Passkey sign-in is discoverable — the browser shows the user's accounts, so
  // no email is required. A typed email (if any) is passed only as a hint.
  async function handlePasskeyLogin() {
    setError("");
    try {
      await runWithLoading(async () => {
        await signInWithPasskey(email.trim() || undefined);
        await redirectAfterAuth();
      });
    } catch (err: unknown) {
      if (isPasskeyCancellation(err)) return; // user dismissed the prompt
      if (isNetworkError(err)) {
        setError("We couldn't reach the server. Please try again.");
        return;
      }
      setError(
        "We couldn't sign you in with a passkey. Try the email link below, or sign in from a device that has your passkey."
      );
    }
  }

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Enter your email to receive a sign-in link.");
      return;
    }
    setLinkLoading(true);
    try {
      await requestMagicLink(email, "login");
      setLinkSent(true);
    } catch (err: unknown) {
      setError(
        isNetworkError(err)
          ? "We couldn't reach the server. Please try again."
          : "Something went wrong. Please try again."
      );
    } finally {
      setLinkLoading(false);
    }
  }

  if (linkSent) {
    return (
      <AuthPageShell containerClassName="space-y-8">
        <div className="mx-auto w-11/12 max-w-sm space-y-3 text-center sm:w-full">
          <MailSentIllustration className="-mt-1" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Check your email
          </h1>
          <p className="mx-auto max-w-[34ch] text-sm leading-relaxed text-muted-foreground">
            If an account can use it, we&apos;ve sent a one-time sign-in link to{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      headline="Welcome back"
      description="Sign in to your Paperbase dashboard."
      containerClassName="space-y-8 sm:space-y-10"
    >
      <div className="mx-auto w-11/12 max-w-sm space-y-6 sm:w-full" aria-busy={loading}>
        {error && (
          <div className="rounded-ui border border-destructive/20 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Primary: passkey — no email needed */}
        {supportsPasskeys ? (
          <Button
            type="button"
            loading={loading}
            onClick={() => void handlePasskeyLogin()}
            className="w-full gap-2"
          >
            <KeyRound size={16} />
            Sign in with a passkey
          </Button>
        ) : (
          <p className="rounded-ui border border-border bg-muted/40 px-3 py-2 text-center text-sm text-muted-foreground">
            This device doesn&apos;t support passkeys. Use the email sign-in link below.
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Fallback: email magic-link — email is entered here */}
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div className="form-field">
            <label htmlFor="email" className="field-label">
              Email
            </label>
            <Input
              id="email"
              type="email"
              size="lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="username webauthn"
              inputMode="email"
            />
          </div>
          <Button type="submit" variant="outline" loading={linkLoading} className="w-full gap-2">
            <Mail size={16} />
            Email me a sign-in link
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        New to Paperbase?{" "}
        <Link
          href={withNext("/signup", nextPath)}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </AuthPageShell>
  );
}
