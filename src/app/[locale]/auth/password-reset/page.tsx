"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { requestPasswordReset } from "@/lib/auth-email";
import { useRateLimitCooldown, extractRateLimitInfo } from "@/hooks/useRateLimitCooldown";
import { useMinDelayLoading } from "@/hooks/useMinDelayLoading";
import { emailSchema } from "@/lib/validation";

export default function PasswordResetRequestPage() {
  const router = useRouter();
  const t = useTranslations("auth.passwordReset");
  const tCommon = useTranslations("common");
  const [email, setEmail] = useState("");
  const [logoutAllDevices, setLogoutAllDevices] = useState(false);
  const [error, setError] = useState("");
  const { loading, runWithLoading } = useMinDelayLoading();
  const cooldown = useRateLimitCooldown();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = emailSchema().safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("invalidEmail"));
      return;
    }
    try {
      await runWithLoading(async () => {
        await requestPasswordReset(parsed.data, logoutAllDevices);
        router.push("/auth/password-reset/sent");
      });
    } catch (err: unknown) {
      const info = extractRateLimitInfo(err);
      if (info) {
        cooldown.startCooldown(info.retryAfter);
        setError("");
      } else {
        setError(t("sendFailed"));
      }
    }
  }

  return (
    <AuthPageShell headline={t("headline")} description={t("description")}>

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
          <label htmlFor="email" className="field-label">
            {t("emailLabel")}
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            size="lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. you@example.com"
          />
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
          loadingText={t("sendResetLinkLoading")}
          disabled={cooldown.isLimited}
        >
          {cooldown.isLimited
            ? tCommon("retryInSeconds", { seconds: cooldown.remaining })
            : t("sendResetLink")}
        </LoadingButton>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("backToLogin")}
        </Link>
      </p>
    </AuthPageShell>
  );
}
