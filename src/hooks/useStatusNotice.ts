"use client";

import { useCallback, useEffect, useState } from "react";

import {
  parseSummary,
  pickNotice,
  readDismissed,
  rememberDismissed,
  statusUrl,
  type StatusNotice,
  type StatusSummary,
} from "@/lib/status-notice";

/** How often the status page is asked, while the dashboard is in view. */
const EVERY_MS = 2 * 60 * 1000;
/** A summary older than this is not shown: the status page has stopped answering. */
const STALE_MS = 10 * 60 * 1000;

/**
 * What the status page says now (lib/status-notice.ts): its summary while fresh, else null -- the
 * status page did not answer, or this dashboard has none. Asked straight from the browser (the
 * status page allows the dashboard's origin) and NOT through react-query: its cache is kept in
 * IndexedDB, and a summary restored from yesterday would be worse than none. `now` is when it was
 * last asked, in milliseconds.
 */
export function useStatusSummary(enabled: boolean): { summary: StatusSummary | null; now: number } {
  const [summary, setSummary] = useState<{ value: StatusSummary; at: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const base = statusUrl();
    if (!enabled || !base) return;
    const controller = new AbortController();
    const load = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch(`${base}/api/v1/summary.json`, {
          credentials: "omit",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const value = parseSummary(await response.json());
        if (value) setSummary({ value, at: Date.now() });
      } catch {
        // Unreachable or refused: the last answer stands until it is too old to show.
      } finally {
        setNow(Date.now());
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);

  return { summary: enabled && summary && now - summary.at < STALE_MS ? summary.value : null, now };
}

/** The status page's notice for the dashboard's bar, and the way to put it away. */
export function useStatusNotice(enabled: boolean): {
  notice: StatusNotice | null;
  dismiss: (key: string) => void;
} {
  const { summary, now } = useStatusSummary(enabled);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  const dismiss = useCallback((key: string) => {
    setDismissed((current) => {
      const next = new Set(current).add(key);
      rememberDismissed(next);
      return next;
    });
  }, []);

  return {
    notice: summary ? pickNotice(summary, Math.floor(now / 1000), dismissed) : null,
    dismiss,
  };
}
