"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { getAccessToken } from "@/lib/auth";
import { fetchMeForRouting, resolvePostAuthPath } from "@/lib/subscription-access";
import SubscriptionAccessBlock from "@/components/auth/SubscriptionAccessBlock";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

type Gate = "loading" | "ok" | "failed";

export default function RecoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("settings.recover");
  const { isAuthenticated, isLoading: authLoading, authHydrated } = useAuth();
  const [gate, setGate] = useState<Gate>("loading");

  useEffect(() => {
    if (!authHydrated || authLoading) return;

    if (!isAuthenticated || !getAccessToken()) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const me = await fetchMeForRouting();
        if (cancelled) return;
        const path = resolvePostAuthPath(me);
        if (path !== "/recover") {
          router.replace(path);
          return;
        }
        if (!cancelled) setGate("ok");
      } catch {
        if (!cancelled) setGate("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authHydrated, authLoading, isAuthenticated, router]);

  const loadingShell = (
    <AuthPageShell
      headline={t("heading")}
      description={t("subtitle")}
      containerClassName="space-y-8 sm:space-y-10"
    >
      <div className="mx-auto flex w-11/12 max-w-sm justify-center py-12 sm:w-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </AuthPageShell>
  );

  if (!authHydrated || authLoading) {
    return loadingShell;
  }

  if (!isAuthenticated || !getAccessToken()) {
    return loadingShell;
  }

  if (gate === "loading") {
    return loadingShell;
  }

  if (gate === "failed") {
    return <SubscriptionAccessBlock variant="verifyFailed" />;
  }

  return <>{children}</>;
}
