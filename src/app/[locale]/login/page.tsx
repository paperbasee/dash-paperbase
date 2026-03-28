"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginSchema, parseValidation } from "@/lib/validation";
import { resolvePostAuthRoute } from "@/lib/subscription-access";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth.login");
  const tCommon = useTranslations("common");
  const tLayout = useTranslations("dashboardLayout");
  const { login, pendingTwoFactor, verifyTwoFactorChallenge } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const validation = parseValidation(loginSchema, { email, password });
    if (!validation.success) {
      setError(
        validation.errors.email ??
          validation.errors.password ??
          t("validCredentialsHint")
      );
      return;
    }
    setLoading(true);
    try {
      const result = await login(validation.data.email, validation.data.password);
      if (!("2fa_required" in result)) {
        const next = await resolvePostAuthRoute();
        if (next.ok) {
          router.push(next.path);
        } else {
          setError(tLayout("subscriptionVerifyBody"));
        }
      }
    } catch (err: unknown) {
      const data =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { status?: number; data?: { code?: string } } }).response
          : undefined;
      if (data?.status === 403 && data.data?.code === "email_not_verified") {
        router.push(
          `/auth/verify-email?email=${encodeURIComponent(validation.data.email)}`
        );
        return;
      }
      setError(t("invalidCredentials"));
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pendingTwoFactor) return;
    setError("");
    setLoading(true);
    try {
      await verifyTwoFactorChallenge(
        pendingTwoFactor.challenge_public_id,
        otpCode
      );
      const next = await resolvePostAuthRoute();
      if (next.ok) {
        router.push(next.path);
      } else {
        setError(tLayout("subscriptionVerifyBody"));
      }
    } catch (err: unknown) {
      const data =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { status?: number; data?: { code?: string } } }).response
          : undefined;
      if (data?.status === 403 && data.data?.code === "email_not_verified") {
        router.push(`/auth/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        return;
      }
      setError(t("invalidOtp"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-muted/30 px-4 py-6">
      <main className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md space-y-8 sm:space-y-10">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t("title")}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("welcome")}
            </p>
          </div>

          <form
            onSubmit={pendingTwoFactor ? handleOtpSubmit : handleSubmit}
            className="mx-auto w-11/12 max-w-sm space-y-6 sm:w-full"
          >
          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {!pendingTwoFactor ? (
            <>
              <div className="form-field">
                <label htmlFor="email" className="field-label">
                  {t("email")}
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  autoComplete="email"
                  inputMode="email"
                />
              </div>

              <div className="form-field">
                <label htmlFor="password" className="field-label">
                  {t("password")}
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("passwordPlaceholder")}
                    className="pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={
                      showPassword ? t("hidePassword") : t("showPassword")
                    }
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 text-sm">
                <label className="inline-flex items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="form-checkbox"
                    disabled={!!pendingTwoFactor}
                  />
                  <span>{t("rememberMe")}</span>
                </label>

                <Link
                  href="/auth/password-reset"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
            </>
          ) : (
            <div className="form-field">
              <label htmlFor="otp" className="field-label">
                {t("verificationCode")}
              </label>
              <Input
                id="otp"
                type="text"
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder={t("otpPlaceholder")}
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </div>
          )}

            <Button type="submit" disabled={loading} className="mt-2 w-full">
              {loading
                ? tCommon("pleaseWait")
                : pendingTwoFactor
                  ? t("verifyCode")
                  : t("loginButton")}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link
              href="/signup"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {t("signUp")}
            </Link>
          </p>
        </div>
      </main>

      <footer className="pb-3 pt-4">
        <div className="mx-auto w-full max-w-sm text-center">
          <p className="text-xs text-muted-foreground sm:whitespace-nowrap">
            <Link
              href="/terms-of-service"
              className="underline-offset-4 hover:underline"
            >
              {tCommon("termsOfService")}
            </Link>{" "}
            <span aria-hidden>•</span>{" "}
            <Link
              href="/privacy-policy"
              className="underline-offset-4 hover:underline"
            >
              {tCommon("privacyPolicy")}
            </Link>{" "}
            <span aria-hidden>•</span>{" "}
            <span>{tCommon("copyrightBrand")}</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
