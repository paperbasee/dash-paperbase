"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const result = await register(email, password, passwordConfirm);
      router.push(result.active_store_id ? "/" : "/onboarding");
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
        setError(errMsg || "Registration failed. Please try again.");
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4">
      <div className="w-full max-w-md rounded-none bg-white/80 p-8 shadow-xl shadow-slate-200 ring-1 ring-slate-100 backdrop-blur">
        <div className="mb-8 space-y-2">
          <p className="text-sm font-normal uppercase tracking-[0.25em] text-slate-500">
            Gadzilla Dashboard
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Create account
          </h1>
          <p className="text-sm text-slate-500">
            Sign up to get started with your store
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50/80 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="e.g. you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="At least 8 characters"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password_confirm"
              className="block text-sm font-medium text-slate-700"
            >
              Confirm password
            </label>
            <input
              id="password_confirm"
              type="password"
              required
              minLength={8}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Repeat your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
