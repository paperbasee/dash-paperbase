"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface UseRefreshCountdownOptions {
  cachedAt?: number; // unix seconds
  ttlSeconds?: number;
  onExpire: () => void | Promise<void>;
  /** When false, the countdown does not tick (interval cleared). */
  enabled?: boolean;
}

export function useRefreshCountdown({
  cachedAt,
  ttlSeconds,
  onExpire,
  enabled = true,
}: UseRefreshCountdownOptions) {
  const resolvedTtlSeconds = typeof ttlSeconds === "number" && Number.isFinite(ttlSeconds) && ttlSeconds > 0
    ? ttlSeconds
    : 300;

  const resolvedCachedAt = typeof cachedAt === "number" && Number.isFinite(cachedAt) && cachedAt > 0
    ? cachedAt
    : Date.now() / 1000;

  const initialSecondsLeft = useMemo(() => {
    const elapsed = Date.now() / 1000 - resolvedCachedAt;
    const left = resolvedTtlSeconds - elapsed;
    return Math.max(0, Math.ceil(left));
  }, [resolvedCachedAt, resolvedTtlSeconds]);

  const [secondsLeft, setSecondsLeft] = useState(initialSecondsLeft);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const secondsLeftRef = useRef(initialSecondsLeft);
  const cachedAtRef = useRef(resolvedCachedAt);
  const ttlSecondsRef = useRef(resolvedTtlSeconds);
  const onExpireRef = useRef(onExpire);
  const enabledRef = useRef(enabled);
  const expireInFlightRef = useRef(false);

  onExpireRef.current = onExpire;
  enabledRef.current = enabled;
  cachedAtRef.current = resolvedCachedAt;
  ttlSecondsRef.current = resolvedTtlSeconds;

  useEffect(() => {
    const elapsed = Date.now() / 1000 - cachedAtRef.current;
    const left = ttlSecondsRef.current - elapsed;
    const next = Math.max(0, Math.ceil(left));
    secondsLeftRef.current = next;
    setSecondsLeft(next);
  }, [resolvedCachedAt, resolvedTtlSeconds]);

  useEffect(() => {
    if (!enabled) return;

    const runExpire = async () => {
      if (expireInFlightRef.current) return;
      expireInFlightRef.current = true;
      setIsRefreshing(true);
      try {
        await Promise.resolve(onExpireRef.current());
      } finally {
        setIsRefreshing(false);
        expireInFlightRef.current = false;
      }
    };

    // If the cache is already stale, refresh immediately.
    if (secondsLeftRef.current <= 0 && !expireInFlightRef.current) {
      void runExpire();
    }

    const tick = () => {
      if (!enabledRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (expireInFlightRef.current) return;
      const cur = secondsLeftRef.current;
      if (cur <= 0) return;
      const next = cur - 1;
      if (next <= 0) {
        secondsLeftRef.current = 0;
        setSecondsLeft(0);
        void runExpire();
        return;
      }
      secondsLeftRef.current = next;
      setSecondsLeft(next);
    };

    if (typeof window === "undefined") return;
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [enabled]);

  return { secondsLeft, isRefreshing };
}
