"use client";

import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { useMinDelayLoading } from "@/hooks/useMinDelayLoading";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";
import { parseValidation, registerSchema } from "@/lib/validation";
import { resolvePostAuthRoute } from "@/lib/subscription-access";
import { isTurnstileDisabled } from "@/lib/turnstile-env";

export default function SignupPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const t = useTranslations("auth.signup");
  const tAuth = useTranslations("auth");
  const tLayout = useTranslations("dashboardLayout");
  const { register, pendingTwoFactor, verifyTwoFactorChallenge } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [error, setError] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const { loading, runWithLoading } = useMinDelayLoading();
  const hasAccountLabel = t("hasAccount");
  const { handleKeyDown } = useEnterNavigation(() => formRef.current?.requestSubmit());

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
        const result = await register(
          validation.data.email,
          validation.data.password,
          validation.data.passwordConfirm,
          turnstileToken
        );
        if ("2fa_required" in result) {
          return;
        }
        const signupTime = Date.now();
        router.push(
          `/auth/verify-email?email=${encodeURIComponent(validation.data.email)}&signup_time=${signupTime}`
        );
      });
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
    }
  }

  async function handleOtpSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pendingTwoFactor) return;
    const flow = pendingTwoFactor.flow;
    setError("");
    try {
      await runWithLoading(async () => {
        await verifyTwoFactorChallenge(
          pendingTwoFactor.challenge_public_id,
          otpCode
        );
        if (flow === "register") {
          const signupTime = Date.now();
          router.push(
            `/auth/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}&signup_time=${signupTime}`
          );
          return;
        }
        const next = await resolvePostAuthRoute();
        if (next.ok) {
          router.push(next.path);
        } else {
          setError(tLayout("subscriptionVerifyBody"));
        }
      });
    } catch {
      setError(t("invalidOtp"));
    }
  }

  return (
    <AuthPageShell
      headline={pendingTwoFactor ? t("twoFactorHeadline") : t("headline")}
      description={pendingTwoFactor ? t("twoFactorDescription") : t("description")}
      containerClassName="space-y-8 sm:space-y-10"
    >

      <form
            ref={formRef}
            onSubmit={pendingTwoFactor ? handleOtpSubmit : handleSubmit}
            className="mx-auto w-11/12 max-w-sm space-y-6 sm:w-full"
            aria-busy={loading}
      >
          {error && (
            <div className="rounded-ui border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
                  size="lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  autoComplete="email"
                  inputMode="email"
                  onKeyDown={handleKeyDown}
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
                    size="lg"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("passwordPlaceholder")}
                    className="pr-10"
                    autoComplete="new-password"
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={showPassword ? t("hidePassword") : t("showPassword")}
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
                    size="lg"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder={t("confirmPlaceholder")}
                    className="pr-10"
                    autoComplete="new-password"
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={
                      showPasswordConfirm ? t("hidePassword") : t("showPassword")
                    }
                  >
                    {showPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <TurnstileWidget />
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
                size="lg"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder={t("otpPlaceholder")}
                inputMode="numeric"
                autoComplete="one-time-code"
                onKeyDown={handleKeyDown}
              />
            </div>
          )}

            <div className="mt-2 space-y-2">
              <LoadingButton
                type="submit"
                isLoading={loading}
                loadingText={
                  pendingTwoFactor ? t("verifyCodeLoading") : t("createAccountLoading")
                }
                className="w-full"
              >
                {pendingTwoFactor ? t("verifyCode") : t("createAccount")}
              </LoadingButton>
              {!pendingTwoFactor ? (
                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  {t("termsAgreementPlain")}
                </p>
              ) : null}
            </div>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {hasAccountLabel.replace("?", "")}
        {hasAccountLabel.includes("?") ? <span className="font-sans">?</span> : null}{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("loginLink")}
        </Link>
      </p>
    </AuthPageShell>
  );
}
