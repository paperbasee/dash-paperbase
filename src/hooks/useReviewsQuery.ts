"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { AdminReview, AdminReviewCounts } from "@/types";
import { reviewCountsQueryKey, reviewsQueryKey } from "@/lib/query-keys";

type Page = { results?: AdminReview[] } | AdminReview[];

function rows(data: Page): AdminReview[] {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.results) ? data.results : [];
}

/**
 * One status's worth of reviews.
 *
 * Keyed on the status because that is what the tab switches between, so moving
 * from Waiting to Published shows the cached list instead of a spinner, and
 * approving something invalidates both.
 */
export function useReviewsQuery(status: string) {
  return useQuery({
    queryKey: reviewsQueryKey(status),
    queryFn: async () => {
      const { data } = await api.get<Page>(`admin/reviews/?status=${encodeURIComponent(status)}`);
      return rows(data);
    },
  });
}

/**
 * How many are waiting, published and rejected.
 *
 * Its own endpoint rather than three list calls: the chips show all three
 * counts at once, and the one that matters — how many are waiting — is the
 * number a merchant opens this page to find out.
 */
export function useReviewCountsQuery() {
  return useQuery({
    queryKey: reviewCountsQueryKey,
    queryFn: async () => {
      const { data } = await api.get<AdminReviewCounts>("admin/reviews/counts/");
      return data;
    },
  });
}
