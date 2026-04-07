"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { getAccessToken } from "@/lib/auth";
import { fetchMeForRouting, resolvePostAuthPath } from "@/lib/subscription-access";
import SubscriptionAccessBlock from "@/components/auth/SubscriptionAccessBlock";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

type SubGate = "idle" | "pending" | "ok" | "failed";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, authHydrated } = useAuth();
  const [subGate, setSubGate] = useState<SubGate>("idle");

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !getAccessToken()) {
      setSubGate("ok");
      return;
    }

    setSubGate("pending");
    let cancelled = false;

    (async () => {
      try {
        const me = await fetchMeForRouting();
        if (cancelled) return;
        const path = resolvePostAuthPath(me);
        if (path === "/plan-not-active") {
          router.replace("/plan-not-active");
          return;
        }
        // Strict ownership: if the user has ANY owned store (active or not), onboarding is blocked.
        // - ACTIVE store -> dashboard
        // - INACTIVE / PENDING_DELETE -> recover
        if (me.active_store_public_id) {
          router.replace("/");
          return;
        }
        if (me.store) {
          router.replace("/recover");
          return;
        }
        if (path === "/recover") {
          router.replace("/recover");
          return;
        }
        setSubGate("ok");
      } catch {
        if (!cancelled) setSubGate("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading, router]);

  if (!authHydrated || authLoading) {
    return (
      <AuthPageShell appName="">
        <div className="mx-auto flex w-full max-w-sm items-center justify-center py-6 sm:py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AuthPageShell>
    );
  }

  if (isAuthenticated && (subGate === "idle" || subGate === "pending")) {
    return (
      <AuthPageShell appName="">
        <div className="mx-auto flex w-full max-w-sm items-center justify-center py-6 sm:py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AuthPageShell>
    );
  }

  if (isAuthenticated && subGate === "failed") {
    return <SubscriptionAccessBlock variant="verifyFailed" />;
  }

  return <>{children}</>;
}
