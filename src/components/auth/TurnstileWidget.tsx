"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: Record<string, unknown>
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

/**
 * Cloudflare Turnstile (managed). Uses the imperative API so the widget works
 * in React: declarative `.cf-turnstile` only runs when the script loads before
 * the node exists, which fails on client-rendered pages.
 */
export function TurnstileWidget() {
  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "0x4AAAAAAC6DO_T68mWECpJd";
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | undefined;

    const mount = () => {
      if (cancelled || !el || !window.turnstile) return false;
      widgetIdRef.current = window.turnstile.render(el, {
        sitekey: siteKey,
        size: "flexible",
        callback: (t: string) => setToken(t),
        "error-callback": () => setToken(""),
        "expired-callback": () => setToken(""),
      });
      return true;
    };

    if (!mount()) {
      poll = setInterval(() => {
        if (mount() && poll) {
          clearInterval(poll);
          poll = undefined;
        }
      }, 50);
    }

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      const id = widgetIdRef.current;
      widgetIdRef.current = null;
      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          /* ignore */
        }
      }
      setToken("");
    };
  }, [siteKey]);

  return (
    <>
      <input type="hidden" name="cf-turnstile-response" value={token} readOnly />
      <div ref={containerRef} className="w-full min-h-[65px]" />
    </>
  );
}
