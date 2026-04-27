"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import SubscriptionAccessBlock from "@/components/auth/SubscriptionAccessBlock";

const DASHBOARD_SERVER_UNREACHABLE_KEY = "paperbase_dashboard_server_unreachable";

function getBackendHealthUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "";
  try {
    const apiUrl = new URL(raw);
    return `${apiUrl.origin}/health`;
  } catch {
    return "/health";
  }
}

export default function ServerUnreachablePage() {
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    fetch(getBackendHealthUrl(), {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) return;
        sessionStorage.removeItem(DASHBOARD_SERVER_UNREACHABLE_KEY);
        router.replace("/");
      })
      .catch(() => {
        // stay on page while backend is still unreachable
      });
    return () => controller.abort();
  }, [router]);

  return <SubscriptionAccessBlock variant="serverUnreachable" />;
}
