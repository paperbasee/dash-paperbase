"use client";

import { useSyncExternalStore } from "react";
import { getApiLatencySnapshot, subscribeApiLatency } from "@/lib/api-latency";

/** Rolling average latency (ms) of recent real API requests, or null before any complete. */
export function useApiLatency(): number | null {
  return useSyncExternalStore(subscribeApiLatency, getApiLatencySnapshot, () => null);
}
