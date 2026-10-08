"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { hasAuthSessionCookie } from "@/lib/auth-session-cookie";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import api from "@/lib/api";

/**
 * Legacy entry: send users to checkout if payment is pending, otherwise dashboard.
 * Plan selection is a one-time / onboarding step from the dashboard, not a hard gate.
 */
export default function PlanNotActivePage() {
  const router = useRouter();

  useEffect(() => {
    if (!hasAuthSessionCookie()) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get<{ pending: boolean }>(
          "billing/payment/pending/"
        );
        if (cancelled) return;
        if (data.pending) {
          router.replace("/checkout");
        } else {
          router.replace("/");
        }
      } catch {
        if (!cancelled) {
          router.replace("/");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <AuthPageShell>
      <div className="mx-auto flex w-full max-w-sm items-center justify-center py-6 sm:py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </AuthPageShell>
  );
}
