"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchCourierBalance, fetchHomeNumbers } from "@/lib/dashboard/home";
import { courierBalanceQueryKey, homeNumbersQueryKey } from "@/lib/query-keys";

/** The home page's "right now" numbers; the API keeps them a minute, so this does too. */
export function useHomeNumbers() {
  return useQuery({
    queryKey: homeNumbersQueryKey,
    queryFn: fetchHomeNumbers,
    staleTime: 60 * 1000,
  });
}

/**
 * The money the courier holds for the shop. Only the owner and Admins may ask (`enabled`);
 * the API keeps an answer ten minutes, so asking sooner only reads the same one.
 */
export function useCourierBalance(enabled: boolean) {
  return useQuery({
    queryKey: courierBalanceQueryKey,
    queryFn: fetchCourierBalance,
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}
