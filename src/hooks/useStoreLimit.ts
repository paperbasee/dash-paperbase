"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface FeaturesResponse {
  features: Record<string, boolean>;
  limits: Record<string, number>;
}

interface MeResponse {
  stores: { id: number; name: string }[];
}

export interface StoreLimitState {
  canAddStore: boolean | null;
  maxStores: number | null;
}

/**
 * Returns whether the user can add another store based on their plan limit.
 * Only fetches when isAuthenticated is true.
 */
export function useStoreLimit(isAuthenticated: boolean): StoreLimitState {
  const [state, setState] = useState<StoreLimitState>({
    canAddStore: null,
    maxStores: null,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setState({ canAddStore: null, maxStores: null });
      return;
    }

    let cancelled = false;

    async function check() {
      try {
        const [featuresRes, meRes] = await Promise.all([
          api.get<FeaturesResponse>("auth/features/"),
          api.get<MeResponse>("auth/me/"),
        ]);
        if (cancelled) return;

        const maxStores = featuresRes.data.limits?.max_stores ?? 0;
        const storeCount = meRes.data.stores?.length ?? 0;
        setState({
          canAddStore: storeCount < maxStores,
          maxStores,
        });
      } catch {
        if (!cancelled) setState({ canAddStore: false, maxStores: null });
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return state;
}
