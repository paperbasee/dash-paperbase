"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface MeResponse {
  public_id?: string;
  subscription?: {
    active: boolean;
    plan: string | null;
    end_date: string | null;
  };
}

interface CurrentUserState {
  publicId: string | null;
  plan: string | null;
  isLoading: boolean;
}

/**
 * Fetches the current user's public_id and subscription plan from auth/me/.
 * Only fires when `isAuthenticated` is true.
 */
export function useCurrentUser(isAuthenticated: boolean): CurrentUserState {
  const [state, setState] = useState<CurrentUserState>({
    publicId: null,
    plan: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setState({ publicId: null, plan: null, isLoading: false });
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
          isLoading: false,
        });
      } catch {
        if (!cancelled) setState({ publicId: null, plan: null, isLoading: false });
      }
    }

    fetch();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return state;
}
