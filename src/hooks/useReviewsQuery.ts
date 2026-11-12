"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { AdminReview, AdminReviewCounts, PaginatedResponse } from "@/types";
import { listPageQuery, type ListPageParams } from "@/lib/paging";
import { reviewCountsQueryKey, reviewsQueryKey } from "@/lib/query-keys";

/**
 * One status's worth of reviews.
 *
 * Keyed on the status because that is what the tab switches between, so moving
 * from Waiting to Published shows the cached list instead of a spinner, and
 * approving something invalidates both.
 */
export async function fetchReviews(
  status: string,
  params: ListPageParams
): Promise<PaginatedResponse<AdminReview>> {
  const { data } = await api.get<PaginatedResponse<AdminReview>>("admin/reviews/", {
    params: { status, ...listPageQuery(params) },
  });
  return data;
}

export function useReviewsQuery(status: string, params: ListPageParams) {
  return useQuery({
    queryKey: reviewsQueryKey(status, params),
    queryFn: () => fetchReviews(status, params),
    // The rows stay on screen while the next page arrives.
    placeholderData: keepPreviousData,
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
