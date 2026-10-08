"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { fetchMeForRouting, setupUnfinished } from "@/lib/subscription-access";
import SubscriptionAccessBlock from "@/components/auth/SubscriptionAccessBlock";

type SubGate = "idle" | "pending" | "ok" | "failed";

function Waiting() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
    </div>
  );
}

/**
 * Setup is for someone without a shop, or an owner whose shop setup made and who has not
 * finished it yet (2026-09-28). Everyone else goes to the dashboard.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAddMode = searchParams.get("add") === "1";
  // Read on arrival only: Finish moves the address to `?step=done` itself, and the gate must not
  // run again then -- it would swap setup out for the wait while the last saves are landing.
  const [arrivedAtDone] = useState(() => searchParams.get("step") === "done");
  const { isAuthenticated, authHydrated } = useAuth();
  const [subGate, setSubGate] = useState<SubGate>("idle");

  useEffect(() => {
    if (!authHydrated) return;

    if (!isAuthenticated) {
      setSubGate("ok");
      return;
    }

    setSubGate("pending");
    let cancelled = false;

    (async () => {
      try {
        const me = await fetchMeForRouting();
        if (cancelled) return;
        // Setup's end (`?step=done`) stays on a reload: only "Go to dashboard" leaves it.
        if (me.active_store_public_id && !setupUnfinished(me) && !isAddMode && !arrivedAtDone) {
          router.replace("/");
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
  }, [isAuthenticated, authHydrated, isAddMode, arrivedAtDone, router]);

  if (!authHydrated) return <Waiting />;
  if (isAuthenticated && (subGate === "idle" || subGate === "pending")) return <Waiting />;
  if (isAuthenticated && subGate === "failed") {
    return <SubscriptionAccessBlock />;
  }
  return <>{children}</>;
}
