"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import api from "@/lib/api";
import { analyticsLiveQueryKey, analyticsSectionQueryKey } from "@/lib/query-keys";

import { type Period, periodQuery } from "./period";
import type { LiveReport, SectionKey } from "./types";

/** The API caches a report for five minutes; asking sooner only gets the same numbers. */
const REPORT_MS = 5 * 60_000;
/** Live is asked for again this often. */
const LIVE_MS = 10_000;
/**
 * Reports are never saved in the browser's storage (lib/queryPersister): they are asked for again
 * every few minutes anyway, and a copy kept for days would outlive the plan or the role that
 * showed it -- a shop gone back to Essential would still have its Premium numbers in DevTools.
 */
const NOT_SAVED = { persist: false } as const;

export function useSection<T>(section: Exclude<SectionKey, "live">, period: Period, enabled: boolean) {
  const query = periodQuery(period);
  return useQuery({
    queryKey: analyticsSectionQueryKey(section, query),
    queryFn: async () => (await api.get<T>(`admin/analytics/${section}/?${query}`)).data,
    enabled,
    staleTime: REPORT_MS,
    refetchInterval: REPORT_MS,
    // Changing the days keeps the last numbers on screen until the new ones arrive.
    placeholderData: keepPreviousData,
    meta: NOT_SAVED,
  });
}

export function useLive(enabled: boolean) {
  return useQuery({
    queryKey: analyticsLiveQueryKey,
    queryFn: async () => (await api.get<LiveReport>("admin/analytics/live/")).data,
    enabled,
    staleTime: 0,
    refetchInterval: LIVE_MS,
    meta: NOT_SAVED,
  });
}
