"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface MeResponse {
  public_id?: string;
  subscription?: {
    active: boolean;
    plan: string | null;
    end_date: string | null;
    is_expiring_soon?: boolean;
    days_remaining?: number;
  };
}

interface CurrentUserState {
  publicId: string | null;
  plan: string | null;
  isExpiringSoon: boolean;
  daysRemaining: number;
  isLoading: boolean;
}

/**
 * Fetches the current user's public_id, subscription plan, and expiration
 * status from auth/me/. Only fires when `isAuthenticated` is true.
 */
export function useCurrentUser(isAuthenticated: boolean): CurrentUserState {
  const [state, setState] = useState<CurrentUserState>({
    publicId: null,
    plan: null,
    isExpiringSoon: false,
    daysRemaining: 0,
    isLoading: true,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setState({
        publicId: null,
        plan: null,
        isExpiringSoon: false,
        daysRemaining: 0,
        isLoading: false,
      });
      return;
    }

    let cancelled = false;

    async function fetch() {
      try {
        const { data } = await api.get<MeResponse>("auth/me/");
        if (cancelled) return;
        setState({
          publicId: data.public_id ?? null,
          plan: data.subscription?.plan ?? null,
          isExpiringSoon: data.subscription?.is_expiring_soon === true,
          daysRemaining: data.subscription?.days_remaining ?? 0,
          isLoading: false,
        });
      } catch {
        if (!cancelled)
          setState({
            publicId: null,
            plan: null,
            isExpiringSoon: false,
            daysRemaining: 0,
            isLoading: false,
          });
      }
    }

    fetch();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return state;
}
