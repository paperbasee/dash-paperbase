import { useState, useEffect, useRef, useCallback } from "react";
import { isApiHttpError } from "@/lib/api-client";

export interface RateLimitInfo {
  action: string;
  retryAfter: number;
}

/**
 * Extract rate-limit cooldown info from a backend 429 response.
 * Returns `null` if the error is not a rate-limit response.
 */
export function extractRateLimitInfo(err: unknown): RateLimitInfo | null {
  if (!isApiHttpError(err)) return null;
  const { response } = err;
  if (response?.status !== 429) return null;
  const data = response.data as Record<string, unknown> | undefined;
  if (
    data &&
    data.error === "rate_limited" &&
    typeof data.retry_after === "number"
  ) {
    return {
      action: typeof data.action === "string" ? data.action : "",
      retryAfter: data.retry_after,
    };
  }
  return null;
}

/**
 * Manages a per-action countdown timer for rate-limit cooldowns.
 *
 * Uses a wall-clock deadline so the UI stays correct after React Strict Mode
 * (effect cleanup clears intervals) and when the tab is backgrounded.
 *
 * - No global state — resets on unmount (page nav, logout, store switch).
 */
export function useRateLimitCooldown() {
  const [remaining, setRemaining] = useState(0);
  const remainingRef = useRef(0);
  const cooldownEndsAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const applyRemainingSeconds = useCallback(
    (mergedSeconds: number) => {
      clearTimer();
      const clamped = Math.max(0, Math.ceil(mergedSeconds));
      if (clamped === 0) {
        cooldownEndsAtRef.current = null;
        remainingRef.current = 0;
        setRemaining(0);
        return;
      }
      const now = Date.now();
      cooldownEndsAtRef.current = now + clamped * 1000;
      remainingRef.current = clamped;
      setRemaining(clamped);
      intervalRef.current = setInterval(() => {
        const end = cooldownEndsAtRef.current;
        if (end == null) return;
        const rem = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        remainingRef.current = rem;
        setRemaining(rem);
        if (rem <= 0) {
          clearTimer();
          cooldownEndsAtRef.current = null;
        }
      }, 1000);
    },
    [clearTimer],
  );

  const startCooldown = useCallback(
    (seconds: number) => {
      applyRemainingSeconds(seconds);
    },
    [applyRemainingSeconds],
  );

  /** Use with 429 retry_after: keeps the longer of current countdown or server value. */
  const mergeCooldownFromSeconds = useCallback(
    (seconds: number) => {
      const s = Math.max(0, Math.ceil(seconds));
      const now = Date.now();
      const prevRem =
        cooldownEndsAtRef.current != null
          ? Math.max(0, Math.ceil((cooldownEndsAtRef.current - now) / 1000))
          : remainingRef.current;
      const next = Math.max(prevRem, s);
      applyRemainingSeconds(next);
    },
    [applyRemainingSeconds],
  );

  const reset = useCallback(() => {
    clearTimer();
    cooldownEndsAtRef.current = null;
    remainingRef.current = 0;
    setRemaining(0);
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    remaining,
    isLimited: remaining > 0,
    startCooldown,
    mergeCooldownFromSeconds,
    reset,
  } as const;
}
