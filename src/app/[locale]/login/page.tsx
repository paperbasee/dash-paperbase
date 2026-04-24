"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { useMinDelayLoading } from "@/hooks/useMinDelayLoading";
import { useRateLimitCooldown, extractRateLimitInfo } from "@/hooks/useRateLimitCooldown";
import { loginSchema, parseValidation } from "@/lib/validation";
import { resolvePostAuthRoute } from "@/lib/subscription-access";
import { isTurnstileDisabled } from "@/lib/turnstile-env";
import { isNetworkError } from "@/lib/network-error";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth.login");
  const tAuth = useTranslations("auth");
  const tLayout = useTranslations("dashboardLayout");
  const {
    login,
    pendingTwoFactor,
    verifyTwoFactorChallenge,
    requestTwoFactorChallengeRecoveryCode,
    verifyTwoFactorChallengeRecovery,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryMode, setRecoveryMode] = useState<"none" | "email" | "code">("none");
  const [recoveryRequestLoading, setRecoveryRequestLoading] = useState(false);
  const [recoveryVerifyLoading, setRecoveryVerifyLoading] = useState(false);
  const recoveryCooldown = useRateLimitCooldown();
  const { loading, runWithLoading } = useMinDelayLoading();
  const forgotPasswordLabel = t("forgotPassword");
  const noAccountLabel = t("noAccount");

  useEffect(() => {
    if (!pendingTwoFactor) {
      setRecoveryMode("none");
      setRecoveryEmail("");
      setRecoveryCode("");
    }
  }, [pendingTwoFactor]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    const validation = parseValidation(loginSchema, { email, password });
    if (!validation.success) {
      setError(
        validation.errors.email ??
          validation.errors.password ??
          t("validCredentialsHint")
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
        const result = await login(validation.data.email, validation.data.password, turnstileToken);
        if (!("2fa_required" in result)) {
          const next = await resolvePostAuthRoute();
          if (next.ok) {
            router.push(next.path);
          } else {
            setError(
              next.kind === "network_error"
                ? t("serverUnreachable")
                : tLayout("subscriptionVerifyBody")
            );
          }
        }
      });
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        setError(t("serverUnreachable"));
        return;
      }
      const res =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { status?: number; data?: { code?: string; detail?: unknown } } })
              .response
          : undefined;
      if (res?.status === 403 && res.data?.code === "email_not_verified") {
        router.push(
          `/auth/verify-email?email=${encodeURIComponent(validation.data.email)}`
        );
        return;
      }
      const detail = res?.data?.detail;
      if (res?.status === 400 && typeof detail === "string") {
        setError(detail);
        return;
      }
      setError(t("invalidCredentials"));
    }
  }

  async function handleOtpSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pendingTwoFactor) return;
    setError("");
    setSuccessMessage("");
    try {
      await runWithLoading(async () => {
        await verifyTwoFactorChallenge(
          pendingTwoFactor.challenge_public_id,
          otpCode
        );
        const next = await resolvePostAuthRoute();
        if (next.ok) {
          router.push(next.path);
        } else {
          setError(
            next.kind === "network_error"
              ? t("serverUnreachable")
              : tLayout("subscriptionVerifyBody")
          );
        }
      });
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        setError(t("serverUnreachable"));
        return;
      }
      const data =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { status?: number; data?: { code?: string } } }).response
          : undefined;
      if (data?.status === 403 && data.data?.code === "email_not_verified") {
        router.push(`/auth/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        return;
      }
      setError(t("invalidOtp"));
    }
  }

  async function handleRecoveryRequest() {
    if (!pendingTwoFactor) return;
    setError("");
    setSuccessMessage("");
    if (!recoveryEmail.trim()) {
      setError(t("recoveryEmailRequired"));
      return;
    }
    setRecoveryRequestLoading(true);
    try {
      const response = await requestTwoFactorChallengeRecoveryCode(
        pendingTwoFactor.challenge_public_id,
        recoveryEmail
      );
      if (!response.sent) {
        setError(t("recoveryEmailNotFound"));
        return;
      }
      setRecoveryMode("code");
      setSuccessMessage(response.detail || t("recoverySent"));
    } catch (err: unknown) {
      const info = extractRateLimitInfo(err);
      if (info) {
        recoveryCooldown.startCooldown(info.retryAfter);
        return;
      }
      if (isNetworkError(err)) {
        setError(t("serverUnreachable"));
        return;
      }
      setError(t("recoverySendFailed"));
    } finally {
      setRecoveryRequestLoading(false);
    }
  }

  async function handleRecoveryVerify(e: FormEvent) {
    e.preventDefault();
    if (!pendingTwoFactor) return;
    setError("");
    setSuccessMessage("");
    setRecoveryVerifyLoading(true);
    try {
      await verifyTwoFactorChallengeRecovery(
        pendingTwoFactor.challenge_public_id,
        recoveryCode
      );
      const next = await resolvePostAuthRoute();
      if (next.ok) {
        router.push(next.path);
      } else {
        setError(
          next.kind === "network_error"
            ? t("serverUnreachable")
            : tLayout("subscriptionVerifyBody")
        );
      }
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        setError(t("serverUnreachable"));
      } else {
        setError(t("recoveryInvalid"));
      }
    } finally {
      setRecoveryVerifyLoading(false);
    }
  }

  return (
    <AuthPageShell
      headline={pendingTwoFactor ? t("twoFactorHeadline") : t("headline")}
      description={pendingTwoFactor ? t("twoFactorDescription") : t("description")}
      containerClassName="space-y-8 sm:space-y-10"
    >

      <form
            onSubmit={pendingTwoFactor ? (recoveryMode === "code" ? handleRecoveryVerify : handleOtpSubmit) : handleSubmit}
            className="mx-auto w-11/12 max-w-sm space-y-6 sm:w-full"
            aria-busy={loading}
      >
          {error && (
            <div className="rounded-ui border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="rounded-ui border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500">
              {successMessage}
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
                    size="lg"
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
                  {forgotPasswordLabel.replace("?", "")}
                  {forgotPasswordLabel.includes("?") ? (
                    <span className="font-sans">?</span>
                  ) : null}
                </Link>
              </div>

              <TurnstileWidget />
            </>
          ) : (
            <div className="form-field">
              {recoveryMode === "email" ? (
                <>
                  <label htmlFor="recovery-email" className="field-label">
                    {t("recoveryEmail")}
                  </label>
                  <Input
                    id="recovery-email"
                    type="email"
                    required
                    size="lg"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder={t("recoveryEmailPlaceholder")}
                    autoComplete="email"
                    inputMode="email"
                  />
                  <LoadingButton
                    type="button"
                    isLoading={recoveryRequestLoading}
                    loadingText={t("sendingRecovery")}
                    onClick={() => void handleRecoveryRequest()}
                    disabled={recoveryVerifyLoading || recoveryCooldown.isLimited}
                    className="mt-2 w-full"
                  >
                    {recoveryCooldown.isLimited
                      ? t("retryIn", { seconds: recoveryCooldown.remaining })
                      : t("sendRecoveryCode")}
                  </LoadingButton>
                </>
              ) : recoveryMode === "code" ? (
                <>
                  <label htmlFor="recovery-code" className="field-label">
                    {t("recoveryCode")}
                  </label>
                  <Input
                    id="recovery-code"
                    type="text"
                    required
                    size="lg"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    placeholder={t("recoveryPlaceholder")}
                    autoComplete="one-time-code"
                  />
                </>
              ) : (
                <>
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
                  />
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  if (recoveryMode !== "none") {
                    setRecoveryMode("none");
                    setError("");
                    setSuccessMessage("");
                    return;
                  }
                  setRecoveryMode("email");
                  setError("");
                  setSuccessMessage("");
                }}
                disabled={recoveryVerifyLoading}
                className="mt-2 text-left text-sm font-medium text-foreground underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-70"
              >
                {recoveryMode !== "none"
                  ? t("backToOtp")
                  : t("cantAccess2fa")}
              </button>
            </div>
          )}

            {!(pendingTwoFactor && recoveryMode === "email") ? (
              <LoadingButton
                type="submit"
                isLoading={loading}
                loadingText={
                  pendingTwoFactor
                    ? recoveryMode === "code"
                      ? t("verifyRecoveryLoading")
                      : t("verifyCodeLoading")
                    : t("loginLoading")
                }
                className="mt-2 w-full"
              >
                {pendingTwoFactor
                  ? recoveryMode === "code"
                    ? t("verifyRecovery")
                    : t("verifyCode")
                  : t("loginButton")}
              </LoadingButton>
            ) : null}
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {noAccountLabel.replace("?", "")}
        {noAccountLabel.includes("?") ? <span className="font-sans">?</span> : null}{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("signUp")}
        </Link>
      </p>
    </AuthPageShell>
  );
}
