"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useMinDelayLoading } from "@/hooks/useMinDelayLoading";
import { confirmPasswordReset } from "@/lib/auth-email";
import { parseValidation, passwordResetConfirmSchema } from "@/lib/validation";

function extractMessage(err: unknown, generic: string): string {
  const res =
    err && typeof err === "object" && "response" in err
      ? (err as { response?: { data?: Record<string, unknown> } }).response
          ?.data
      : null;
  if (!res || typeof res !== "object") return generic;
  const msg = (v: unknown) =>
    Array.isArray(v) ? (v[0] as string) : typeof v === "string" ? v : null;
  return (
    msg(res.new_password) ??
    msg(res.new_password_confirm) ??
    msg(res.token) ??
    msg(res.uid) ??
    msg(res.detail) ??
    generic
  );
}

export default function PasswordResetConfirmContent() {
  const router = useRouter();
  const t = useTranslations("auth.passwordReset");
  const tSignup = useTranslations("auth.signup");
  const tPages = useTranslations("pages");
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";
  const logoutAllDevicesParam = searchParams.get("logout_all_devices");
  const defaultLogoutAllDevices =
    logoutAllDevicesParam === "1" || logoutAllDevicesParam === "true";

  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [logoutAllDevices, setLogoutAllDevices] = useState(defaultLogoutAllDevices);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [error, setError] = useState("");
  const { loading, runWithLoading } = useMinDelayLoading();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!uid || !token) {
      setError(t("linkInvalidSubmit"));
      return;
    }
    const validation = parseValidation(passwordResetConfirmSchema, {
      newPassword,
      newPasswordConfirm,
    });
    if (!validation.success) {
      setError(
        validation.errors.newPasswordConfirm ??
          validation.errors.newPassword ??
          tPages("formFixHighlighted")
      );
      return;
    }
    try {
      await runWithLoading(async () => {
        await confirmPasswordReset({
          uid,
          token,
          new_password: validation.data.newPassword,
          new_password_confirm: validation.data.newPasswordConfirm,
          logout_all_devices: logoutAllDevices,
        });
        router.push("/auth/password-reset/success");
      });
    } catch (err: unknown) {
      setError(extractMessage(err, t("genericError")));
    }
  }

  if (!uid || !token) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t("invalidLinkTitle")}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("invalidLinkBody")}</p>
        </div>

        <div className="mx-auto w-11/12 max-w-sm space-y-6 sm:w-full">
          <Button asChild className="mt-2 w-full" variant="outline">
            <Link href="/auth/password-reset">{t("requestNewLink")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t("confirmTitle")}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("confirmSubtitle")}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto w-11/12 max-w-sm space-y-6 sm:w-full"
        aria-busy={loading}
      >
        {error ? (
          <div className="rounded-ui border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <div className="form-field">
          <label htmlFor="new_password" className="field-label">
            {t("newPassword")}
          </label>
          <div className="relative">
            <Input
              id="new_password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              size="lg"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("passwordPlaceholder")}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={showPassword ? tSignup("hidePassword") : tSignup("showPassword")}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="new_password_confirm" className="field-label">
            {t("confirmPassword")}
          </label>
          <div className="relative">
            <Input
              id="new_password_confirm"
              type={showPasswordConfirm ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              size="lg"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              placeholder={t("confirmPlaceholder")}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPasswordConfirm((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={
                showPasswordConfirm ? tSignup("hidePassword") : tSignup("showPassword")
              }
            >
              {showPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={logoutAllDevices}
            onChange={(e) => setLogoutAllDevices(e.target.checked)}
            className="form-checkbox"
          />
          <span>{t("logoutAllDevices")}</span>
        </label>
        <LoadingButton
          type="submit"
          className="mt-2 w-full"
          isLoading={loading}
          loadingText={t("resetPasswordLoading")}
        >
          {t("resetPassword")}
        </LoadingButton>
      </form>
    </div>
  );
}
