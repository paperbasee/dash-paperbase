"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { couponsQueryKey } from "@/lib/query-keys";
import type { Coupon, CouponWrite } from "@/types";

export async function fetchCoupons(): Promise<Coupon[]> {
  const { data } = await api.get<Coupon[] | { results: Coupon[] }>("admin/coupons/");
  return Array.isArray(data) ? data : (data?.results ?? []);
}

export function useCouponsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: couponsQueryKey,
    queryFn: fetchCoupons,
    enabled: options?.enabled ?? true,
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: couponsQueryKey }),
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (publicId: string) => {
      await api.delete(`admin/coupons/${publicId}/`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: couponsQueryKey }),
  });
}
