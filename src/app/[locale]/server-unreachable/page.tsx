"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import UnreachableScreen from "@/components/unreachable/UnreachableScreen";
import { accountsUrl } from "@/lib/accounts/config";
import { askUntilBack } from "@/lib/ask-until-back";

const DASHBOARD_SERVER_UNREACHABLE_KEY = "paperbase_dashboard_server_unreachable";
/** Seconds between two asks, counted down on the page. */
const EVERY_S = 15;

function getBackendHealthUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "";
  try {
    const apiUrl = new URL(raw);
    return `${apiUrl.origin}/health`;
  } catch {
    return "/health";
  }
}

/** Whether the part that was away answers now. */
async function answers(signIn: boolean, signal: AbortSignal): Promise<boolean> {
  try {
    if (signIn) {
      // Accounts' health answers no other origin: an answer at all is enough.
      await fetch(`${accountsUrl()}/health`, { mode: "no-cors", signal, cache: "no-store" });
      return true;
    }
    const res = await fetch(getBackendHealthUrl(), { signal, cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

function onConnectionChange(changed: () => void) {
  window.addEventListener("online", changed);
  window.addEventListener("offline", changed);
  return () => {
    window.removeEventListener("online", changed);
    window.removeEventListener("offline", changed);
  };
}

/**
 * A part of Paperbase did not answer: the API, or (`?part=sign-in`) Accounts, where the dashboard
 * gets its passes -- or the device itself is offline. The page asks every 15 seconds (at once on
 * Try now, and as soon as the device is back online), and once it answers loads the dashboard
 * afresh: a move inside the page would keep the profile's "unreachable" error, and the dashboard
 * would send the person straight back here.
 */
export default function ServerUnreachablePage() {
  const locale = useLocale();
  const signIn = useSearchParams().get("part") === "sign-in";
  const online = useSyncExternalStore(onConnectionChange, () => navigator.onLine, () => true);
  const [checking, setChecking] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(EVERY_S);
  const askNow = useRef<() => void>(() => {});

  useEffect(() => {
    const asking = askUntilBack({
      answers: (signal) => answers(signIn, signal),
      everyS: EVERY_S,
      online: () => navigator.onLine,
      onBack: () => {
        sessionStorage.removeItem(DASHBOARD_SERVER_UNREACHABLE_KEY);
        window.location.replace(`/${locale}`);
      },
      onCount: setSecondsLeft,
      onChecking: setChecking,
    });
    askNow.current = asking.now;
    window.addEventListener("online", asking.now);
    return () => {
      asking.stop();
      window.removeEventListener("online", asking.now);
    };
  }, [locale, signIn]);

  return (
    <UnreachableScreen
      part={!online ? "offline" : signIn ? "signIn" : "api"}
      checking={checking}
      secondsLeft={secondsLeft}
      onTryNow={() => askNow.current()}
    />
  );
}
