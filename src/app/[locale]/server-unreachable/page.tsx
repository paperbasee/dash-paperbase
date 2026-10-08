"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import SubscriptionAccessBlock from "@/components/auth/SubscriptionAccessBlock";
import { accountsUrl } from "@/lib/accounts/config";

const DASHBOARD_SERVER_UNREACHABLE_KEY = "paperbase_dashboard_server_unreachable";
const EVERY_MS = 15_000;

function getBackendHealthUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "";
  try {
    const apiUrl = new URL(raw);
    return `${apiUrl.origin}/health`;
  } catch {
    return "/health";
  }
}

/**
 * A part of Paperbase did not answer: the API, or (`?part=sign-in`) Accounts, where the dashboard
 * gets its passes. The page keeps asking, and goes back to the dashboard once it answers.
 */
export default function ServerUnreachablePage() {
  const router = useRouter();
  const signIn = useSearchParams().get("part") === "sign-in";

  useEffect(() => {
    const controller = new AbortController();
    const ask = () =>
      (signIn
        ? // Accounts' health answers no other origin: an answer at all is enough.
          fetch(`${accountsUrl()}/health`, { mode: "no-cors", signal: controller.signal, cache: "no-store" })
        : fetch(getBackendHealthUrl(), { signal: controller.signal, cache: "no-store" }).then((res) => {
            if (!res.ok) throw new Error("not yet");
            return res;
          })
      )
        .then(() => {
          sessionStorage.removeItem(DASHBOARD_SERVER_UNREACHABLE_KEY);
          router.replace("/");
        })
        .catch(() => {
          // Still away: asked again in a moment.
        });
    ask();
    const timer = setInterval(ask, EVERY_MS);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [router, signIn]);

  return <SubscriptionAccessBlock variant={signIn ? "signInUnreachable" : "serverUnreachable"} />;
}
