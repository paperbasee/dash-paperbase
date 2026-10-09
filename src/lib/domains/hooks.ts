"use client";

import {
  mutationOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { domainsQueryKey, storeQueryKey } from "@/lib/query-keys";
import {
  checkHttps,
  connectDomain,
  domainIsSettling,
  fetchDomains,
  HttpsCheckRefusedError,
  removeDomain,
  setPrimaryDomain,
  verifyDomain,
  withCheckedDomain,
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

function invalidateDomains(client: QueryClient) {
  void client.invalidateQueries({ queryKey: domainsQueryKey });
  // The shop's live address follows its primary domain (the sidebar's View my shop).
  void client.invalidateQueries({ queryKey: storeQueryKey });
}

function useInvalidateDomains() {
  const qc = useQueryClient();
  return () => invalidateDomains(qc);
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

/**
 * "Check again" on a live custom domain. The answer is that domain as the check left it, so it
 * goes straight into its row and the notice beside it changes with the toast; nothing else moved,
 * so nothing else is fetched. A list poll already on its way is called off first: it read the row
 * before the check wrote it, and landing after it would put the old notice back under the toast.
 * Refused because the domain is no longer live, or is gone, means this page shows an old state:
 * the list is fetched again, and the store with it, since the shop's live address may have been
 * that domain.
 */
export function checkHttpsMutationOptions(client: QueryClient) {
  return mutationOptions({
    mutationFn: (publicId: string) => checkHttps(publicId),
    onSuccess: async (checked) => {
      await client.cancelQueries({ queryKey: domainsQueryKey });
      client.setQueryData<StoreDomain[]>(domainsQueryKey, (rows) => withCheckedDomain(rows, checked));
    },
    onError: (error) => {
      if (error instanceof HttpsCheckRefusedError && error.reason === "not_live") {
        invalidateDomains(client);
      }
    },
  });
}

export function useCheckHttps() {
  const qc = useQueryClient();
  return useMutation(checkHttpsMutationOptions(qc));
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
