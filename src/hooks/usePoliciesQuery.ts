"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { policiesQueryKey } from "@/lib/query-keys";

/*
 * The shop's policies (2026-09-25): written in Settings -> Policies, shown on the
 * shop only where the merchant links them -- a footer column -- plus the small
 * links beside the footer's year and at checkout, which list every written one.
 */

export type PolicyKind = "privacy" | "terms" | "shipping" | "returns" | "other";

export type Policy = {
  public_id: string;
  kind: PolicyKind;
  title: string;
  /** Made from the first title and kept, so a footer link survives a rename. */
  slug: string;
  content: string;
  position: number;
  /** Has words a shopper could read. An unwritten policy has no page and no link. */
  is_written: boolean;
  created_at: string;
  updated_at: string;
};

/** The four common kinds, in the order Settings offers them. Each is held once. */
export const COMMON_POLICY_KINDS = ["privacy", "terms", "shipping", "returns"] as const;

/** Where a policy lives on the shop, as a footer link stores it. */
export function policyPath(policy: Pick<Policy, "slug">): string {
  return `/policies/${policy.slug}`;
}

export async function fetchPolicies(): Promise<Policy[]> {
  // Twenty at most, so the API sends the whole list rather than a page of it.
  const { data } = await api.get<Policy[] | { results?: Policy[] }>("admin/policies/");
  return Array.isArray(data) ? data : (data.results ?? []);
}

/** `enabled`: false while the screen asking is not shown, so a hidden tab reads nothing. */
export function usePoliciesQuery(enabled = true) {
  return useQuery({ queryKey: policiesQueryKey, queryFn: fetchPolicies, enabled });
}
