"use client";

import { useQuery } from "@tanstack/react-query";

import api from "@/lib/api";
import { fetchFraudKey } from "@/lib/fraud-key";
import { fraudKeyQueryKey } from "@/lib/query-keys";

/** The shop's fraud check key (lib/fraud-key.ts): Settings > Fraud check, and the orders list's warning. */
export function useFraudKeyQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: fraudKeyQueryKey,
    queryFn: () => fetchFraudKey(api),
    enabled: options?.enabled ?? true,
  });
}
