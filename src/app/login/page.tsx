"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginSchema, parseValidation } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
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
          "Please provide valid credentials."
      );
      return;
    }
    setLoading(true);
    try {
      const result = await login(validation.data.email, validation.data.password);
      if (!("2fa_required" in result)) {
        router.push(result.active_store_id ? "/" : "/onboarding");
      }
    } catch {
      setError("Invalid credentials. Please try again.");
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
      router.push(result.active_store_id ? "/" : "/onboarding");
    } catch {
      setError("Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted px-4">
      <div className="w-full max-w-md border border-border bg-card p-8 shadow-xl backdrop-blur">
        <div className="mb-8 space-y-2">
          <p className="text-sm font-normal uppercase tracking-[0.25em] text-muted-foreground">
            Gadzilla Dashboard
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Login
          </h1>
          <p className="text-sm text-muted-foreground">
            Hi, welcome back{" "}
            <span role="img" aria-label="waving hand">
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
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. johndoe@email.com"
                />
              </div>

              <div className="form-field">
                <label htmlFor="password" className="field-label">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
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

              <div className="text-right text-sm">
                <Link
                  href="/auth/password-reset"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </>
          ) : (
            <div className="form-field">
              <label htmlFor="otp" className="field-label">
                Verification code
              </label>
              <Input
                id="otp"
                type="text"
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Enter 6-digit code"
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
              <span>Remember me</span>
            </label>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="mt-2 w-full"
          >
            {loading ? "Please wait..." : pendingTwoFactor ? "Verify code" : "Login"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
