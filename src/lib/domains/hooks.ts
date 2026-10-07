"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { domainsQueryKey, storeQueryKey } from "@/lib/query-keys";
import {
  connectDomain,
  domainIsSettling,
  fetchDomains,
  removeDomain,
  setPrimaryDomain,
  verifyDomain,
  type StoreDomain,
} from "./api";

/** Re-check while a domain is mid-connection; the server poller runs every 5 min. */
const SETTLING_REFETCH_MS = 30_000;

export function useDomainsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: domainsQueryKey,
    queryFn: fetchDomains,
    enabled: options?.enabled ?? true,
    // Only poll while something is actually in flight, so a settled store makes
    // no background requests at all.
    refetchInterval: (query) => {
      const domains = query.state.data as StoreDomain[] | undefined;
      return domains?.some(domainIsSettling) ? SETTLING_REFETCH_MS : false;
    },
  });
}

function useInvalidateDomains() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: domainsQueryKey });
    // The shop's live address follows its primary domain (the sidebar's View my shop).
    void qc.invalidateQueries({ queryKey: storeQueryKey });
  };
}

export function useConnectDomain() {
  const invalidate = useInvalidateDomains();
  return useMutation({
    mutationFn: (hostname: string) => connectDomain(hostname),
    onSuccess: invalidate,
  });
}

export function useVerifyDomain() {
  const invalidate = useInvalidateDomains();
  return useMutation({
    mutationFn: (publicId: string) => verifyDomain(publicId),
    onSuccess: invalidate,
  });
}

export function useSetPrimaryDomain() {
  const invalidate = useInvalidateDomains();
  return useMutation({
    mutationFn: (publicId: string) => setPrimaryDomain(publicId),
    onSuccess: invalidate,
  });
}

export function useRemoveDomain() {
  const invalidate = useInvalidateDomains();
  return useMutation({
    mutationFn: (publicId: string) => removeDomain(publicId),
    onSuccess: invalidate,
  });
}
