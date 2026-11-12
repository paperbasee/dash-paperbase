"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { couponsQueryKey, couponsQueryKeyRoot } from "@/lib/query-keys";
import type { Coupon, CouponWrite, PaginatedResponse } from "@/types";
import { DEFAULT_PAGE_SIZE, listPageQuery, type ListPageParams } from "@/lib/paging";

export async function fetchCoupons(
  params: ListPageParams = { page: 1, pageSize: DEFAULT_PAGE_SIZE }
): Promise<PaginatedResponse<Coupon>> {
  const { data } = await api.get<PaginatedResponse<Coupon>>("admin/coupons/", {
    params: listPageQuery(params),
  });
  return data;
}

export function useCouponsQuery(
  params: ListPageParams = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: couponsQueryKey(params),
    queryFn: () => fetchCoupons(params),
    enabled: options?.enabled ?? true,
    // The rows stay on screen while the next page arrives.
    placeholderData: keepPreviousData,
  });
}

/**
 * Create, edit and switch off, all invalidating the one list.
 *
 * The counted columns — how often a code has been used and what it has cost —
 * are computed by the server over the redemptions. Nothing here keeps its own
 * tally, so there is no second number to fall out of step.
 */
export function useSaveCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ publicId, body }: { publicId?: string; body: CouponWrite }) => {
      if (publicId) {
        const { data } = await api.patch<Coupon>(`admin/coupons/${publicId}/`, body);
        return data;
      }
      const { data } = await api.post<Coupon>("admin/coupons/", body);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: couponsQueryKeyRoot }),
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (publicId: string) => {
      await api.delete(`admin/coupons/${publicId}/`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: couponsQueryKeyRoot }),
  });
}
