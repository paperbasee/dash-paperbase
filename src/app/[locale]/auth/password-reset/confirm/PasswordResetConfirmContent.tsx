"use client";

import { useState, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { confirmPasswordReset } from "@/lib/auth-email";
import { parseValidation, passwordResetConfirmSchema } from "@/lib/validation";

function extractMessage(err: unknown): string {
  const res =
    err && typeof err === "object" && "response" in err
      ? (err as { response?: { data?: Record<string, unknown> } }).response
          ?.data
      : null;
  if (!res || typeof res !== "object") return "Something went wrong. Please try again.";
  const msg = (v: unknown) =>
    Array.isArray(v) ? (v[0] as string) : typeof v === "string" ? v : null;
  return (
    msg(res.new_password) ??
    msg(res.new_password_confirm) ??
    msg(res.token) ??
    msg(res.uid) ??
    msg(res.detail) ??
    "Something went wrong. Please try again."
  );
}

export default function PasswordResetConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!uid || !token) {
      setError("This reset link is invalid or incomplete. Request a new one.");
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
          "Please correct the highlighted fields."
      );
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset({
        uid,
        token,
        new_password: validation.data.newPassword,
        new_password_confirm: validation.data.newPasswordConfirm,
      });
      router.push("/auth/password-reset/success");
    } catch (err: unknown) {
      setError(extractMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (!uid || !token) {
    return (
      <div className="w-full max-w-md border border-border bg-card p-8 shadow-xl backdrop-blur">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Invalid link
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This password reset link is missing required parameters. Open the link
          from your email or request a new reset.
        </p>
        <Button asChild className="mt-6 w-full" variant="outline">
          <Link href="/auth/password-reset">Request new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md border border-border bg-card p-8 shadow-xl backdrop-blur">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Set new password
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Choose a new password for your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {error ? (
          <div className="border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <div className="form-field">
          <label htmlFor="new_password" className="field-label">
            New password
          </label>
          <div className="relative">
            <Input
              id="new_password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="new_password_confirm" className="field-label">
            Confirm password
          </label>
          <div className="relative">
            <Input
              id="new_password_confirm"
              type={showPasswordConfirm ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              placeholder="Repeat your password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPasswordConfirm((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none"
              aria-label={
                showPasswordConfirm ? "Hide password" : "Show password"
              }
            >
              {showPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Please wait…" : "Reset password"}
        </Button>
      </form>
    </div>
  );
}
