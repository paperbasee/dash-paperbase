"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseValidation, registerSchema } from "@/lib/validation";

export default function SignupPage() {
  const router = useRouter();
  const t = useTranslations("auth.signup");
  const tBrand = useTranslations("auth");
  const tCommon = useTranslations("common");
  const { register, pendingTwoFactor, verifyTwoFactorChallenge } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const validation = parseValidation(registerSchema, {
      email,
      password,
      passwordConfirm,
    });
    if (!validation.success) {
      setError(
        validation.errors.passwordConfirm ??
          validation.errors.password ??
          validation.errors.email ??
          t("correctFields")
      );
      return;
    }
    setLoading(true);
    try {
      const result = await register(
        validation.data.email,
        validation.data.password,
        validation.data.passwordConfirm
      );
      if ("2fa_required" in result) {
        return;
      }
      router.push(
        `/auth/verify-email?email=${encodeURIComponent(validation.data.email)}`
      );
    } catch (err: unknown) {
      const res =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: Record<string, unknown> } }).response
              ?.data
          : null;
      if (res && typeof res === "object") {
        const msg = (v: unknown) =>
          Array.isArray(v) ? (v[0] as string) : typeof v === "string" ? v : null;
        const errMsg =
          msg(res.email) ??
          msg(res.password_confirm) ??
          msg(res.password) ??
          (typeof res.detail === "string" ? res.detail : null);
        setError(errMsg || t("registrationFailed"));
      } else {
        setError(t("registrationFailed"));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pendingTwoFactor) return;
    const flow = pendingTwoFactor.flow;
    setError("");
    setLoading(true);
    try {
      const result = await verifyTwoFactorChallenge(
        pendingTwoFactor.challenge_public_id,
        otpCode
      );
      if (flow === "register") {
        router.push(
          `/auth/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`
        );
        return;
      }
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
            {t("subtitle")}
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
                    minLength={8}
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

              <div className="form-field">
                <label htmlFor="password_confirm" className="field-label">
                  {t("confirmPassword")}
                </label>
                <div className="relative">
                  <Input
                    id="password_confirm"
                    type={showPasswordConfirm ? "text" : "password"}
                    required
                    minLength={8}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder={t("confirmPlaceholder")}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={
                      showPasswordConfirm
                        ? t("hidePassword")
                        : t("showPassword")
                    }
                  >
                    {showPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
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

          <Button
            type="submit"
            disabled={loading}
            className="mt-2 w-full"
          >
            {loading
              ? tCommon("pleaseWait")
              : pendingTwoFactor
                ? t("verifyCode")
                : t("createAccount")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t("loginLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
