"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginSchema, parseValidation } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth.login");
  const tBrand = useTranslations("auth");
  const tCommon = useTranslations("common");
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
        router.push(result.active_store_public_id ? "/" : "/onboarding");
      }
    } catch {
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
      const result = await verifyTwoFactorChallenge(
        pendingTwoFactor.challenge_public_id,
        otpCode
      );
      router.push(result.active_store_public_id ? "/" : "/onboarding");
    } catch {
      setError(t("invalidOtp"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted px-4">
      <div className="w-full max-w-md border border-border bg-card p-8 shadow-xl backdrop-blur">
        <div className="mb-8 space-y-2">
          <p className="text-sm font-normal uppercase tracking-[0.25em] text-muted-foreground">
            {tBrand("brandSubtitle")}
          </p>
          <h1 className="text-3xl font-semibold leading-relaxed tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("welcome")}{" "}
            <span role="img" aria-label={t("wavingHandAria")}>
              👋
            </span>
          </p>
        </div>

        <form
          onSubmit={pendingTwoFactor ? handleOtpSubmit : handleSubmit}
          className="space-y-6"
        >
          {error && (
            <div className="border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={
                      showPassword ? t("hidePassword") : t("showPassword")
                    }
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="text-right text-sm">
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
              />
            </div>
          )}

          <div className="flex items-center text-sm">
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
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="mt-2 w-full"
          >
            {loading
              ? tCommon("pleaseWait")
              : pendingTwoFactor
                ? t("verifyCode")
                : t("loginButton")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link
            href="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t("signUp")}
          </Link>
        </p>
      </div>
    </div>
  );
}
