"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { KeyRound } from "lucide-react";

import api from "@/lib/api";
import { isApiHttpError } from "@/lib/api-client";
import { storeAuthTokens } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { browserSupportsWebAuthn, isPasskeyCancellation } from "@/lib/passkeys";

interface InvitePreview {
  store_name: string;
  role_name: string;
  email_masked: string;
  inviter_name: string;
  expires_at: string;
}

type Phase = "loading" | "invalid" | "ready" | "accepting" | "joining" | "accepted";

/** Pull a human-friendly message out of a DRF 400 (field errors or detail). */
function firstErrorMessage(err: unknown, fallback: string): string {
  if (isApiHttpError(err) && err.data && typeof err.data === "object") {
    const data = err.data as Record<string, unknown>;
    for (const key of ["detail", "email", "token"]) {
      const v = data[key];
      if (typeof v === "string" && v.trim()) return v;
      if (Array.isArray(v) && typeof v[0] === "string") return v[0];
    }
  }
  return isApiHttpError(err) ? err.message || fallback : fallback;
}

export default function TeamInviteAcceptPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const { isAuthenticated, enrollPasskey } = useAuth();

  const [phase, setPhase] = useState<Phase>("loading");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState("");

  // Load the (anonymous) preview so the user sees what they're accepting.
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setPhase("invalid");
      setError("This invite link is missing its token.");
      return;
    }
    (async () => {
      try {
        const { data } = await api.post<InvitePreview>(
          "team/invites/preview/",
          { token }
        );
        if (cancelled) return;
        setPreview(data);
        setPhase("ready");
      } catch (err) {
        if (cancelled) return;
        setPhase("invalid");
        setError(
          isApiHttpError(err) && typeof err.data === "object"
            ? ((err.data as { detail?: string })?.detail ??
              "This invite link is invalid, expired, or already used.")
            : "This invite link is invalid, expired, or already used."
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleAccept() {
    setPhase("accepting");
    setError("");
    try {
      const { data } = await api.post<{
        store: { public_id: string };
        access: string;
        refresh: string;
      }>("team/invites/accept/", { token });
      // Swap in the store-scoped tokens the accept endpoint minted, so the
      // dashboard resolves the newly joined store without a second login.
      if (data.access && data.refresh) {
        storeAuthTokens(data.access, data.refresh);
      }
      setPhase("accepted");
      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    } catch (err) {
      setPhase("ready");
      setError(
        isApiHttpError(err)
          ? (err.message ?? "Could not accept the invite.")
          : "Could not accept the invite."
      );
    }
  }

  // Brand-new person: create a passwordless account, join, then create a passkey
  // (which logs them in) — all in one flow.
  async function handleJoinNew() {
    setError("");
    if (!browserSupportsWebAuthn()) {
      setError("This device doesn't support passkeys. Open this invite on a device that does.");
      return;
    }
    setPhase("joining");
    try {
      const { data } = await api.post<{ enrollment_ticket: string }>(
        "team/invites/accept-new/",
        { token }
      );
      const result = await enrollPasskey({ enrollmentTicket: data.enrollment_ticket });
      if (!result.tokens) {
        setPhase("ready");
        setError("Something went wrong finishing your passkey. Please try again.");
        return;
      }
      setPhase("accepted");
      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    } catch (err) {
      setPhase("ready");
      if (isPasskeyCancellation(err)) {
        setError("Passkey setup was cancelled. Try again to finish joining.");
        return;
      }
      setError(firstErrorMessage(err, "Could not create your account."));
    }
  }

  function goToLogin() {
    const next = encodeURIComponent(`/team/invite?token=${token}`);
    router.push(`/login?next=${next}`);
  }

  return (
    <AuthPageShell
      headline="Team invitation"
      description={
        preview
          ? `You've been invited to join ${preview.store_name}.`
          : "Review your invitation."
      }
    >
      <div className="rounded-card border border-border bg-background p-6 space-y-5">
        {phase === "loading" && (
          <div className="flex items-center justify-center py-6">
            <Spinner />
          </div>
        )}

        {phase === "invalid" && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => router.push("/")}>
              Go home
            </Button>
          </div>
        )}

        {(phase === "ready" || phase === "accepting" || phase === "joining") &&
          preview && (
            <div className="space-y-5">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Store</dt>
                  <dd className="font-medium">{preview.store_name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Role</dt>
                  <dd className="font-medium">{preview.role_name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Invited address</dt>
                  <dd className="font-medium">{preview.email_masked}</dd>
                </div>
                {preview.inviter_name && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Invited by</dt>
                    <dd className="font-medium">{preview.inviter_name}</dd>
                  </div>
                )}
              </dl>

              {error && <p className="text-sm text-destructive">{error}</p>}

              {isAuthenticated ? (
                <Button
                  className="w-full"
                  disabled={phase === "accepting"}
                  onClick={handleAccept}
                >
                  {phase === "accepting" ? "Accepting…" : "Accept invitation"}
                </Button>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Create your account and join with a passkey — no password.
                    You&apos;ll use your device (Touch ID, Windows Hello, or a
                    security key) to sign in.
                  </p>
                  <Button
                    className="w-full gap-2"
                    disabled={phase === "joining"}
                    onClick={() => void handleJoinNew()}
                  >
                    <KeyRound size={16} />
                    {phase === "joining" ? "Setting up…" : "Create account & passkey"}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={goToLogin}
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      Sign in to accept
                    </button>
                  </p>
                </div>
              )}
            </div>
          )}

        {phase === "accepted" && (
          <div className="space-y-3 text-center">
            <p className="text-sm font-medium">You&apos;ve joined the team!</p>
            <p className="text-sm text-muted-foreground">
              Redirecting you to the dashboard…
            </p>
          </div>
        )}
      </div>
    </AuthPageShell>
  );
}
