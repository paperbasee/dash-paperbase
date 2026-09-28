"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Fingerprint, Mail } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useHideAuthTabs } from "@/components/auth/AuthFrame";
import { AuthDivider, AuthError } from "@/components/auth/AuthParts";
import { CheckEmailPanel } from "@/components/auth/CheckEmailPanel";
import { useMinDelayLoading } from "@/hooks/useMinDelayLoading";
import { resolvePostAuthRoute } from "@/lib/subscription-access";
import { getSafeNextPath } from "@/lib/safe-next";
import { isNetworkError } from "@/lib/network-error";
import { browserSupportsWebAuthn, isPasskeyCancellation } from "@/lib/passkeys";

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const tAuth = useTranslations("auth");
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
  useHideAuthTabs(linkSent);

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
      setError(next.kind === "network_error" ? tAuth("unreachable") : t("accountCheckFailed"));
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
      setError(isNetworkError(err) ? tAuth("unreachable") : t("passkeyFailed"));
    }
  }

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError(t("emailRequired"));
      return;
    }
    setLinkLoading(true);
    try {
      await requestMagicLink(email, "login");
      setLinkSent(true);
    } catch (err: unknown) {
      setError(isNetworkError(err) ? tAuth("unreachable") : t("failed"));
    } finally {
      setLinkLoading(false);
    }
  }

  return (
    <>
      {linkSent ? (
        <CheckEmailPanel email={email.trim()} variant="signin" onBack={() => setLinkSent(false)} />
      ) : (
        <div className="pb-stagger space-y-6" aria-busy={loading}>
          {error ? <AuthError>{error}</AuthError> : null}

          <div className="space-y-5">
            {supportsPasskeys ? (
              <Button
                type="button"
                loading={loading}
                onClick={() => void handlePasskeyLogin()}
                className="h-11 w-full"
              >
                <Fingerprint className="size-[18px]" aria-hidden />
                {t("passkey")}
              </Button>
            ) : (
              <p className="rounded-ui border border-border bg-muted/40 px-3 py-2 text-center text-sm text-muted-foreground">
                {t("noPasskeys")}
              </p>
            )}

            <AuthDivider>{t("orEmail")}</AuthDivider>

            {/* The fallback: a sign-in link, by email */}
            <form onSubmit={handleMagicLink} className="space-y-3">
              <div className="form-field">
                <label htmlFor="email" className="field-label">
                  {t("email")}
                </label>
                <Input
                  id="email"
                  type="email"
                  size="lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  autoComplete="username webauthn"
                  inputMode="email"
                />
              </div>
              <Button type="submit" loading={linkLoading} className="h-11 w-full">
                <Mail className="size-[18px]" aria-hidden />
                {t("sendLink")}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
