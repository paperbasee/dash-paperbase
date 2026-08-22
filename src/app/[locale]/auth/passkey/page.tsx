"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { KeyRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { resolvePostAuthRoute } from "@/lib/subscription-access";
import { isNetworkError } from "@/lib/network-error";
import { browserSupportsWebAuthn, isPasskeyCancellation } from "@/lib/passkeys";

type Phase = "verifying" | "enroll" | "error";

export default function MagicLinkPasskeyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { verifyMagicLink, enrollPasskey } = useAuth();

  const [phase, setPhase] = useState<Phase>("verifying");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [ticket, setTicket] = useState("");
  const verifiedRef = useRef(false);

  const goToDashboard = useCallback(async () => {
    const next = await resolvePostAuthRoute();
    router.push(next.ok ? next.path : "/");
  }, [router]);

  useEffect(() => {
    if (verifiedRef.current) return;
    verifiedRef.current = true;
    if (!token) {
      setPhase("error");
      setError("This link is missing its token.");
      return;
    }
    void (async () => {
      try {
        const result = await verifyMagicLink(token);
        if (result.action === "signed_in") {
          await goToDashboard();
          return;
        }
        setTicket(result.enrollment_ticket);
        setEmail(result.email);
        setPhase("enroll");
      } catch (err: unknown) {
        setPhase("error");
        const res =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { detail?: unknown } } }).response
            : undefined;
        setError(
          typeof res?.data?.detail === "string"
            ? res.data.detail
            : "This link is invalid or has expired."
        );
      }
    })();
  }, [token, verifyMagicLink, goToDashboard]);

  async function handleEnroll() {
    setError("");
    if (!browserSupportsWebAuthn()) {
      setError("This device doesn't support passkeys. Open the link on a device that does.");
      return;
    }
    setEnrolling(true);
    try {
      const result = await enrollPasskey({ enrollmentTicket: ticket });
      if (result.tokens) {
        await goToDashboard();
      } else {
        setError("Something went wrong finishing your passkey. Please try again.");
      }
    } catch (err: unknown) {
      if (isPasskeyCancellation(err)) {
        setError("Passkey setup was cancelled. Try again to finish.");
        return;
      }
      if (isNetworkError(err)) {
        setError("We couldn't reach the server. Please try again.");
        return;
      }
      setError("We couldn't create your passkey. Please try again.");
    } finally {
      setEnrolling(false);
    }
  }

  if (phase === "verifying") {
    return (
      <AuthPageShell headline="Verifying your link" description="One moment…">
        <div className="mx-auto w-11/12 max-w-sm text-center sm:w-full" aria-busy>
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        </div>
      </AuthPageShell>
    );
  }

  if (phase === "error") {
    return (
      <AuthPageShell headline="Link problem" description={error}>
        <div className="mx-auto w-11/12 max-w-sm space-y-4 text-center sm:w-full">
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      headline="Create your passkey"
      description="Finish setting up passwordless sign-in."
      containerClassName="space-y-8"
    >
      <div className="mx-auto w-11/12 max-w-sm space-y-6 text-center sm:w-full">
        {error && (
          <div className="rounded-ui border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <p className="text-sm leading-relaxed text-muted-foreground">
          You&apos;re signing in as{" "}
          <span className="font-medium text-foreground">{email}</span>. Create a
          passkey now — your device (Touch ID, Windows Hello, or a security key)
          becomes your sign-in. No password to remember.
        </p>
        <Button
          type="button"
          loading={enrolling}
          onClick={() => void handleEnroll()}
          className="w-full gap-2"
        >
          <KeyRound size={16} />
          Create a passkey
        </Button>
      </div>
    </AuthPageShell>
  );
}
